import type { Request, Response } from "express";
import { ClickIncrementSchema, type ClickCounts } from "@click/shared";
import { db } from "./db";
import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";

// Single collection holding both the global counter and per-user counters,
// keyed by a stable string _id ("global" or the user id).
type CounterDoc = { _id: string; count: number };
const counters = db.collection<CounterDoc>("clickCounters");

// Ensure the global counter document exists so $inc always has something to
// increment and GET returns 0 instead of null on a fresh database.
await counters.updateOne(
  { _id: "global" },
  { $setOnInsert: { count: 0 } },
  { upsert: true },
);

async function getUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session?.user.id ?? null;
}

async function readCounts(userId: string | null): Promise<ClickCounts> {
  const ids = userId ? ["global", userId] : ["global"];
  const docs = await counters.find({ _id: { $in: ids } }).toArray();
  const byId = new Map(docs.map((d) => [d._id, d.count]));
  return {
    global: byId.get("global") ?? 0,
    user: userId ? (byId.get(userId) ?? 0) : null,
  };
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

  await counters.updateOne(
    { _id: "global" },
    { $inc: { count } },
    { upsert: true },
  );
  if (userId) {
    await counters.updateOne(
      { _id: userId },
      { $inc: { count } },
      { upsert: true },
    );
  }

  res.json(await readCounts(userId));
}
