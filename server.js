const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const adminToken = process.env.ADMIN_TOKEN || "devtoken";
const adminUsername = process.env.ADMIN_USERNAME || "Frobinson6722";
const adminPassword = process.env.ADMIN_PASSWORD || "3rdeyeEsg!";
const databaseUrl = process.env.DATABASE_URL || "";
const packageInfo = require("./package.json");
const buildId = process.env.SOURCE_VERSION
  || process.env.GIT_SHA
  || process.env.KOYEB_GIT_SHA
  || Date.now().toString(36);
const startedAt = new Date().toISOString();

app.use(express.json());
app.use(express.static("public"));

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Set it to your Postgres connection.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    );
  `);
}

function normalizeQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    text: row.text,
    votes: row.votes,
    createdAt: Number(row.created_at),
  };
}

async function listQuestions(sort, page, limit) {
  let orderBy = "votes DESC, created_at DESC";
  if (sort === "newest") orderBy = "created_at DESC";
  if (sort === "oldest") orderBy = "created_at ASC";
  if (sort === "low") orderBy = "votes ASC, created_at DESC";
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 20;
  const countResult = await pool.query("SELECT COUNT(*)::int AS total FROM questions");
  const totalItems = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const effectivePage = safePage > totalPages ? totalPages : safePage;
  const offset = (effectivePage - 1) * safeLimit;
  const itemsResult = await pool.query(
    `SELECT * FROM questions ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [safeLimit, offset]
  );

  return {
    items: itemsResult.rows.map(normalizeQuestion),
    page: effectivePage,
    pageSize: safeLimit,
    totalItems,
    totalPages,
  };
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
  pool
    .query(
      "INSERT INTO questions (text, votes, created_at) VALUES ($1, 0, $2) RETURNING *",
      [text, createdAt]
    )
    .then((result) => res.status(201).json(normalizeQuestion(result.rows[0])))
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Failed to save question." });
    });
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

  const delta = direction === "up" ? 1 : -1;
  pool
    .query(
      "UPDATE questions SET votes = votes + $1 WHERE id = $2 RETURNING id, votes",
      [delta, id]
    )
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Question not found." });
      }
      return res.json(result.rows[0]);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Vote failed." });
    });
});

app.get("/questions", (_req, res) => {
  const sort = String(_req.query?.sort || "top").toLowerCase();
  const page = Number.parseInt(String(_req.query?.page || "1"), 10);
  const limit = Number.parseInt(String(_req.query?.limit || "20"), 10);
  listQuestions(sort, page, limit)
    .then((payload) => res.json(payload))
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Failed to load questions." });
    });
});

app.get("/version", (_req, res) => {
  return res.json({
    version: packageInfo.version,
    build: buildId,
    startedAt,
  });
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
  pool
    .query("DELETE FROM questions")
    .then(() => res.json({ ok: true }))
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Clear failed." });
    });
});

app.delete("/admin/question/:id", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Valid question id is required." });
  }
  pool
    .query("DELETE FROM questions WHERE id = $1", [id])
    .then((result) => {
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Question not found." });
      }
      return res.json({ ok: true });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Delete failed." });
    });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      if (!process.env.ADMIN_TOKEN) {
        console.log("ADMIN_TOKEN not set; using default 'devtoken'.");
      }
    });
  })
  .catch((error) => {
    console.error("Failed to init database:", error);
    process.exit(1);
  });
