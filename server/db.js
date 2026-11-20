import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const defaultData = {
  users: [],
  chats: [],
};

// Ensure data directory and database file exist
function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

initDB();

let writeQueue = Promise.resolve();

export function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      chats: Array.isArray(parsed.chats) ? parsed.chats : [],
    };
  } catch {
    return { users: [], chats: [] };
  }
}

export function writeDB(data) {
  writeQueue = writeQueue.then(async () => {
    await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  });
  return writeQueue;
}