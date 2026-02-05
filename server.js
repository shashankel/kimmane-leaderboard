const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const Database = require("better-sqlite3");

dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "leaderboard.db");

const CATEGORIES = ["Net Stroke Play", "Stable Ford"];
const POINTS = { 1: 3, 2: 2, 3: 1 };

if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  console.warn("Admin password is not set. Admin login will fail.");
}
if (!JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Admin login will fail.");
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    first TEXT NOT NULL,
    second TEXT NOT NULL,
    third TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(month, category)
  );
`);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const eventInsert = db.prepare(
  `INSERT INTO events (id, month, category, first, second, third, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const eventDelete = db.prepare("DELETE FROM events WHERE id = ?");
const eventByMonthCategory = db.prepare(
  "SELECT id FROM events WHERE month = ? AND category = ?"
);
const eventById = db.prepare("SELECT * FROM events WHERE id = ?");
const eventListAll = db.prepare(
  "SELECT * FROM events ORDER BY month DESC, category ASC"
);
const eventListByYear = db.prepare(
  "SELECT * FROM events WHERE month LIKE ? ORDER BY month DESC, category ASC"
);

function requireAdmin(req, res, next) {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) {
    return res.status(401).json({ error: "Missing admin token." });
  }
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "Server not configured." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: "Invalid admin token." });
    }
    req.admin = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid admin token." });
  }
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function mapEventRow(row) {
  return {
    id: row.id,
    month: row.month,
    category: row.category,
    placements: [
      { position: 1, player: row.first },
      { position: 2, player: row.second },
      { position: 3, player: row.third },
    ],
    createdAt: row.created_at,
  };
}

function listEvents(year) {
  const rows =
    year && year !== "all"
      ? eventListByYear.all(`${year}-%`)
      : eventListAll.all();
  return rows.map(mapEventRow);
}

function addPoints(map, player, points) {
  map.set(player, (map.get(player) || 0) + points);
}

function computeLeaderboard(events) {
  const overall = new Map();
  const byCategory = {
    "Net Stroke Play": new Map(),
    "Stable Ford": new Map(),
  };

  for (const event of events) {
    for (const placement of event.placements) {
      const points = POINTS[placement.position] || 0;
      addPoints(overall, placement.player, points);
      if (!byCategory[event.category]) {
        byCategory[event.category] = new Map();
      }
      addPoints(byCategory[event.category], placement.player, points);
    }
  }

  const toSortedRows = (map) =>
    [...map.entries()]
      .map(([player, points]) => ({ player, points }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.player.localeCompare(b.player);
      });

  return {
    overall: toSortedRows(overall),
    byCategory: {
      "Net Stroke Play": toSortedRows(byCategory["Net Stroke Play"]),
      "Stable Ford": toSortedRows(byCategory["Stable Ford"]),
    },
  };
}

function validateEventInput({ month, category, winners }) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return "Month must be in YYYY-MM format.";
  }
  if (!CATEGORIES.includes(category)) {
    return "Category is not valid.";
  }
  if (!Array.isArray(winners) || winners.length !== 3) {
    return "Three winners are required.";
  }
  const normalized = winners.map((player) => normalizeName(player));
  if (normalized.some((player) => !player)) {
    return "All winners must have names.";
  }
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    return "Placements must be different players.";
  }
  return null;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/leaderboard", (req, res) => {
  const year = req.query.year || "all";
  const events = listEvents(year);
  const leaderboard = computeLeaderboard(events);
  res.json({
    year,
    categories: CATEGORIES,
    points: POINTS,
    overall: leaderboard.overall,
    byCategory: leaderboard.byCategory,
    updatedAt: new Date().toISOString(),
  });
});

app.get("/api/events", (req, res) => {
  const year = req.query.year || "all";
  const events = listEvents(year);
  res.json({ year, events });
});

app.post("/api/admin/login", (req, res) => {
  const { username = ADMIN_USERNAME, password = "" } = req.body || {};
  if ((!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) || !JWT_SECRET) {
    return res.status(500).json({ error: "Admin login not configured." });
  }
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  let isValid = false;
  if (ADMIN_PASSWORD_HASH) {
    isValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  } else {
    isValid = password === ADMIN_PASSWORD;
  }
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, expiresIn: "12h" });
});

app.post("/api/events", requireAdmin, (req, res) => {
  const { month, category, winners } = req.body || {};
  const error = validateEventInput({ month, category, winners });
  if (error) {
    return res.status(400).json({ error });
  }
  if (eventByMonthCategory.get(month, category)) {
    return res.status(409).json({
      error: "Results already exist for this month and category.",
    });
  }
  const id =
    typeof randomUUID === "function"
      ? randomUUID()
      : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const normalized = winners.map((player) => normalizeName(player));
  eventInsert.run(
    id,
    month,
    category,
    normalized[0],
    normalized[1],
    normalized[2],
    new Date().toISOString()
  );
  const created = mapEventRow(eventById.get(id));
  return res.status(201).json({ event: created });
});

app.delete("/api/events/:id", requireAdmin, (req, res) => {
  const result = eventDelete.run(req.params.id);
  if (!result.changes) {
    return res.status(404).json({ error: "Event not found." });
  }
  return res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`Leaderboard server running on http://localhost:${PORT}`);
});
