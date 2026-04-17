import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { RegisterSchema } from "@click/shared";
import { auth } from "./auth";

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = express();

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// Better Auth handler must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Server is running", timestamp: new Date().toISOString() });
});

app.post("/api/example/register-preview", (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  res.json({ ok: true, data: parsed.data });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});