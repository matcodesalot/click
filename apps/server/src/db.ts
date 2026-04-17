import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/click";

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

try {
  await mongoose.connect(MONGODB_URI);
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
}
