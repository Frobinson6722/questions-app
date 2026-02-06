const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = process.env.PORT || 3000;
const adminToken = process.env.ADMIN_TOKEN || "devtoken";
const adminUsername = process.env.ADMIN_USERNAME || "Frobinson6722";
const adminPassword = process.env.ADMIN_PASSWORD || "3rdeyeEsg!";
const dbPath = process.env.DB_PATH || "questions.db";
const db = new Database(dbPath);

app.use(express.json());
app.use(express.static("public"));

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

const insertQuestion = db.prepare(
  "INSERT INTO questions (text, votes, created_at) VALUES (?, 0, ?)"
);
const findQuestionById = db.prepare("SELECT * FROM questions WHERE id = ?");
const updateVotes = db.prepare("UPDATE questions SET votes = ? WHERE id = ?");
const listTop = db.prepare(
  "SELECT * FROM questions ORDER BY votes DESC, created_at DESC"
);
const listNewest = db.prepare(
  "SELECT * FROM questions ORDER BY created_at DESC"
);
const listLowest = db.prepare(
  "SELECT * FROM questions ORDER BY votes ASC, created_at DESC"
);
const clearAll = db.prepare("DELETE FROM questions");
const deleteById = db.prepare("DELETE FROM questions WHERE id = ?");

function normalizeQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    text: row.text,
    votes: row.votes,
    createdAt: row.created_at,
  };
}

function listQuestions(sort) {
  if (sort === "newest") return listNewest.all().map(normalizeQuestion);
  if (sort === "low") return listLowest.all().map(normalizeQuestion);
  return listTop.all().map(normalizeQuestion);
}

app.post("/question", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Question text is required." });
  }
  if (text.length > 280) {
    return res.status(400).json({ error: "Question is too long (max 280 chars)." });
  }

  const createdAt = Date.now();
  const info = insertQuestion.run(text, createdAt);
  const question = findQuestionById.get(info.lastInsertRowid);
  return res.status(201).json(normalizeQuestion(question));
});

app.post("/vote", (req, res) => {
  const id = Number(req.body?.id);
  const direction = req.body?.direction;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Valid question id is required." });
  }
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ error: "Direction must be 'up' or 'down'." });
  }

  const question = findQuestionById.get(id);
  if (!question) {
    return res.status(404).json({ error: "Question not found." });
  }

  const nextVotes = question.votes + (direction === "up" ? 1 : -1);
  updateVotes.run(nextVotes, question.id);
  return res.json({ id: question.id, votes: nextVotes });
});

app.get("/questions", (_req, res) => {
  const sort = String(_req.query?.sort || "top").toLowerCase();
  return res.json(listQuestions(sort));
});

function isAdmin(req) {
  const headerToken = req.header("x-admin-token");
  const authHeader = req.header("authorization");
  const bearerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const token = headerToken || bearerToken;
  return token && token === adminToken;
}

app.post("/admin/login", (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  return res.json({ token: adminToken });
});

app.post("/admin/clear", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  clearAll.run();
  return res.json({ ok: true });
});

app.delete("/admin/question/:id", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Valid question id is required." });
  }
  const info = deleteById.run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Question not found." });
  }
  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  if (!process.env.ADMIN_TOKEN) {
    console.log("ADMIN_TOKEN not set; using default 'devtoken'.");
  }
});
