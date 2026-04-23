import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = createClient({ url: REDIS_URL });

redis.on("error", (err) => {
  console.error("Redis client error:", err);
});

try {
  await redis.connect();
  console.log("Connected to Redis");
} catch (err) {
  console.error("Failed to connect to Redis:", err);
  process.exit(1);
}
