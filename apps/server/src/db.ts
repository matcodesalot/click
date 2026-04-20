import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/click";

export const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
}

export const db = client.db();
