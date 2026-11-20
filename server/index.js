import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import chatsRoutes from "./routes/chats.js";
import chatStreamRoutes from "./routes/chatStream.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Fardin AI Chatbot API",
    defaultModel: process.env.AI_DEFAULT_MODEL || "gemini-3.5-flash-lite",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/chat", chatStreamRoutes);

// Serve built React frontend in production
const clientDistPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Fardin AI Chatbot server running on http://localhost:${PORT}`);
});