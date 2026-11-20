import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { readDB, writeDB } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Register new user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({
      error: "Name, valid email, and password (min 6 characters) are required.",
    });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();

  if (db.users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  await writeDB(db);

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  });
});

// Login user
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// Get current authenticated user
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;