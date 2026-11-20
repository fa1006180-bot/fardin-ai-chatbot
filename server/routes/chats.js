import express from "express";
import { v4 as uuidv4 } from "uuid";
import { readDB, writeDB } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// List all chats for current user (newest first)
router.get("/", (req, res) => {
  const db = readDB();
  const userChats = db.chats
    .filter((c) => c.userId === req.user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt, messages }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      messageCount: messages.length,
    }));

  res.json({ chats: userChats });
});

// Get single chat with full messages
router.get("/:id", (req, res) => {
  const db = readDB();
  const chat = db.chats.find(
    (c) => c.id === req.params.id && c.userId === req.user.id
  );

  if (!chat) {
    return res.status(404).json({ error: "Chat not found." });
  }

  res.json({ chat });
});

// Create a new empty chat
router.post("/", async (req, res) => {
  const db = readDB();
  const now = new Date().toISOString();

  const newChat = {
    id: uuidv4(),
    userId: req.user.id,
    title: req.body?.title?.trim() || "New Chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  db.chats.push(newChat);
  await writeDB(db);

  res.status(201).json({ chat: newChat });
});

// Rename a chat
router.patch("/:id", async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ error: "Chat title cannot be empty." });
  }

  const db = readDB();
  const chat = db.chats.find(
    (c) => c.id === req.params.id && c.userId === req.user.id
  );

  if (!chat) {
    return res.status(404).json({ error: "Chat not found." });
  }

  chat.title = title.trim().slice(0, 100);
  chat.updatedAt = new Date().toISOString();
  await writeDB(db);

  res.json({ chat });
});

// Delete a single chat
router.delete("/:id", async (req, res) => {
  const db = readDB();
  const initialLength = db.chats.length;
  db.chats = db.chats.filter(
    (c) => !(c.id === req.params.id && c.userId === req.user.id)
  );

  if (db.chats.length === initialLength) {
    return res.status(404).json({ error: "Chat not found." });
  }

  await writeDB(db);
  res.json({ success: true });
});

// Clear all chats for user
router.delete("/", async (req, res) => {
  const db = readDB();
  db.chats = db.chats.filter((c) => c.userId !== req.user.id);
  await writeDB(db);
  res.json({ success: true });
});

export default router;