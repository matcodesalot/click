import type { Request, Response } from "express";
import type { AnyBulkWriteOperation } from "mongodb";
import { ClickIncrementSchema, type ClickCounts } from "@click/shared";
import { db } from "./db";
import { redis } from "./redis";
import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";

// Mongo remains the durable store; Redis is the hot, authoritative copy
// while the server is running. A background flusher snapshots dirty keys
// from Redis back into this collection.
type CounterDoc = { _id: string; count: number };
const counters = db.collection<CounterDoc>("clickCounters");

const DIRTY_SET = "clicks:dirty";
const FLUSH_INTERVAL_MS = 10_000;
const counterKey = (id: string) => `clicks:counter:${id}`;

// On boot, copy any existing Mongo counts into Redis (without overwriting
// values Redis already has — Redis wins while running). Also guarantee the
// "global" key exists so reads return 0 instead of null on a fresh install.
async function hydrateFromMongo(): Promise<void> {
  const docs = await counters.find({}).toArray();
  for (const doc of docs) {
    await redis.set(counterKey(doc._id), String(doc.count), { NX: true });
  }
  await redis.set(counterKey("global"), "0", { NX: true });
  await counters.updateOne(
    { _id: "global" },
    { $setOnInsert: { count: 0 } },
    { upsert: true },
  );
}

await hydrateFromMongo();

async function getUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session?.user.id ?? null;
}

// Reads from Redis; on a Redis cache miss (e.g. first time we see a user
// after a Redis restart) falls back to Mongo and warms the cache.
async function readCount(id: string): Promise<number> {
  const cached = await redis.get(counterKey(id));
  if (cached !== null) return Number(cached);
  const doc = await counters.findOne({ _id: id });
  const value = doc?.count ?? 0;
  await redis.set(counterKey(id), String(value), { NX: true });
  return value;
}

async function readCounts(userId: string | null): Promise<ClickCounts> {
  const global = await readCount("global");
  const user = userId ? await readCount(userId) : null;
  return { global, user };
}

export async function getClicks(req: Request, res: Response) {
  const userId = await getUserId(req);
  res.json(await readCounts(userId));
}

export async function postClicks(req: Request, res: Response) {
  const parsed = ClickIncrementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { count } = parsed.data;
  const userId = await getUserId(req);

  // Warm the per-user cache from Mongo before incrementing so a cold Redis
  // doesn't reset a returning user's count to `count`.
  if (userId) await readCount(userId);

  const tx = redis.multi();
  tx.incrBy(counterKey("global"), count);
  tx.sAdd(DIRTY_SET, "global");
  if (userId) {
    tx.incrBy(counterKey(userId), count);
    tx.sAdd(DIRTY_SET, userId);
  }
  await tx.exec();

  res.json(await readCounts(userId));
}

// ---- background flush: Redis -> Mongo --------------------------------------

let flushing = false;

async function flushDirty(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const ids = await redis.sMembers(DIRTY_SET);
    if (ids.length === 0) return;

    const ops: AnyBulkWriteOperation<CounterDoc>[] = [];
    for (const id of ids) {
      // Atomically read the current value and clear the dirty marker. If a
      // click lands between this exec and the bulkWrite, postClicks will
      // re-add the id to DIRTY_SET and the next flush will catch up.
      const tx = redis.multi();
      tx.get(counterKey(id));
      tx.sRem(DIRTY_SET, id);
      const replies = (await tx.exec()) as unknown as [string | null, number];
      const val = replies[0];
      if (val === null) continue;
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { count: Number(val) } },
          upsert: true,
        },
      });
    }
    if (ops.length > 0) {
      await counters.bulkWrite(ops);
    }
  } finally {
    flushing = false;
  }
}

const flushTimer = setInterval(() => {
  flushDirty().catch((err) => console.error("Click flush failed:", err));
}, FLUSH_INTERVAL_MS);
flushTimer.unref();

async function shutdown(): Promise<void> {
  clearInterval(flushTimer);
  try {
    await flushDirty();
  } catch (err) {
    console.error("Final click flush failed:", err);
  }
}

process.once("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});
