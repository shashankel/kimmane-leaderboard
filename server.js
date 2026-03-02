const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const multer = require("multer");
const Database = require("better-sqlite3");

dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "leaderboard.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  console.warn("Admin password is not set. Admin login will fail.");
}
if (!JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Admin login will fail.");
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    cover_image TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournament_photos (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    image_path TEXT NOT NULL,
    caption TEXT,
    is_cover INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    category TEXT NOT NULL,
    event_date TEXT,
    first_name TEXT NOT NULL,
    first_photo TEXT,
    second_name TEXT NOT NULL,
    second_photo TEXT,
    third_name TEXT NOT NULL,
    third_photo TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );
`);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

const tournamentInsert = db.prepare(
  `INSERT INTO tournaments (id, name, location, start_date, end_date, description, cover_image, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const tournamentList = db.prepare(
  "SELECT * FROM tournaments ORDER BY start_date DESC, created_at DESC"
);
const tournamentById = db.prepare("SELECT * FROM tournaments WHERE id = ?");
const tournamentUpdateCover = db.prepare(
  "UPDATE tournaments SET cover_image = ? WHERE id = ?"
);
const tournamentUpdate = db.prepare(
  "UPDATE tournaments SET name = ?, location = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?"
);

const photoInsert = db.prepare(
  `INSERT INTO tournament_photos (id, tournament_id, image_path, caption, is_cover, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const photoListByTournament = db.prepare(
  "SELECT * FROM tournament_photos WHERE tournament_id = ? ORDER BY created_at DESC"
);
const photoById = db.prepare(
  "SELECT * FROM tournament_photos WHERE id = ? AND tournament_id = ?"
);
const photoDelete = db.prepare(
  "DELETE FROM tournament_photos WHERE id = ? AND tournament_id = ?"
);
const photoClearCover = db.prepare(
  "UPDATE tournament_photos SET is_cover = 0 WHERE tournament_id = ?"
);
const photoSetCover = db.prepare(
  "UPDATE tournament_photos SET is_cover = 1 WHERE id = ?"
);

const resultInsert = db.prepare(
  `INSERT INTO results (
     id,
     tournament_id,
     category,
     event_date,
     first_name,
     first_photo,
     second_name,
     second_photo,
     third_name,
     third_photo,
     created_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const resultListByTournament = db.prepare(
  "SELECT * FROM results WHERE tournament_id = ? ORDER BY event_date DESC, category ASC, created_at DESC"
);
const resultById = db.prepare(
  "SELECT * FROM results WHERE id = ? AND tournament_id = ?"
);
const resultDelete = db.prepare(
  "DELETE FROM results WHERE id = ? AND tournament_id = ?"
);
const resultByTournamentCategoryDate = db.prepare(
  "SELECT id FROM results WHERE tournament_id = ? AND category = ? AND event_date = ?"
);
const resultByTournamentCategoryNoDate = db.prepare(
  "SELECT id FROM results WHERE tournament_id = ? AND category = ? AND event_date IS NULL"
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 6 ? ext : "";
    cb(null, `${randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed."));
  },
});

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function parseOptionalDate(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function removeUploadedFile(imagePath) {
  if (!imagePath) return;
  const fileName = path.basename(imagePath);
  const absolute = path.join(UPLOAD_DIR, fileName);
  if (absolute.startsWith(UPLOAD_DIR) && fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}

function mapTournamentRow(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    coverImage: row.cover_image,
    createdAt: row.created_at,
  };
}

function mapPhotoRow(row) {
  return {
    id: row.id,
    image: row.image_path,
    caption: row.caption,
    isCover: Boolean(row.is_cover),
    createdAt: row.created_at,
  };
}

function mapResultRow(row) {
  return {
    id: row.id,
    category: row.category,
    eventDate: row.event_date,
    placements: [
      { position: 1, player: row.first_name, photo: row.first_photo },
      { position: 2, player: row.second_name, photo: row.second_photo },
      { position: 3, player: row.third_name, photo: row.third_photo },
    ],
    createdAt: row.created_at,
  };
}

function tableExists(name) {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(name)
  );
}

function maybeMigrateLegacyEvents() {
  if (!tableExists("events")) return;
  const tournamentsCount = db
    .prepare("SELECT COUNT(*) AS count FROM tournaments")
    .get().count;
  if (tournamentsCount > 0) return;
  const legacyEvents = db.prepare("SELECT * FROM events").all();
  if (!legacyEvents.length) return;

  const tournamentId = randomUUID();
  tournamentInsert.run(
    tournamentId,
    "Monthly Medal Match",
    "Kimmane Golf Terrain",
    null,
    null,
    "Migrated from the previous leaderboard data.",
    null,
    new Date().toISOString()
  );

  legacyEvents.forEach((eventRow) => {
    const eventDate =
      eventRow.month && /^\d{4}-\d{2}$/.test(eventRow.month)
        ? `${eventRow.month}-01`
        : null;
    resultInsert.run(
      randomUUID(),
      tournamentId,
      eventRow.category,
      eventDate,
      eventRow.first,
      null,
      eventRow.second,
      null,
      eventRow.third,
      null,
      eventRow.created_at || new Date().toISOString()
    );
  });
}

maybeMigrateLegacyEvents();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/tournaments", (req, res) => {
  const tournaments = tournamentList.all().map(mapTournamentRow);
  res.json({ tournaments });
});

app.get("/api/tournaments/:id", (req, res) => {
  const tournament = tournamentById.get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found." });
  }
  const photos = photoListByTournament
    .all(req.params.id)
    .map(mapPhotoRow);
  const results = resultListByTournament
    .all(req.params.id)
    .map(mapResultRow);
  return res.json({
    tournament: mapTournamentRow(tournament),
    photos,
    results,
  });
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

app.post("/api/tournaments", requireAdmin, (req, res) => {
  const name = normalizeText(req.body?.name);
  if (!name) {
    return res.status(400).json({ error: "Tournament name is required." });
  }
  const location = normalizeText(req.body?.location) || "Kimmane Golf Terrain";
  const startDateRaw = normalizeText(req.body?.startDate);
  const endDateRaw = normalizeText(req.body?.endDate);
  if (startDateRaw && !parseOptionalDate(startDateRaw)) {
    return res
      .status(400)
      .json({ error: "Start date must be in YYYY-MM-DD format." });
  }
  if (endDateRaw && !parseOptionalDate(endDateRaw)) {
    return res
      .status(400)
      .json({ error: "End date must be in YYYY-MM-DD format." });
  }
  const startDate = startDateRaw || null;
  const endDate = endDateRaw || null;
  const description = normalizeText(req.body?.description) || null;
  const id = randomUUID();
  tournamentInsert.run(
    id,
    name,
    location,
    startDate,
    endDate,
    description,
    null,
    new Date().toISOString()
  );
  const created = tournamentById.get(id);
  return res.status(201).json({ tournament: mapTournamentRow(created) });
});

app.patch("/api/tournaments/:id", requireAdmin, (req, res) => {
  const tournament = tournamentById.get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found." });
  }
  const startDateRaw = normalizeText(req.body?.startDate);
  const endDateRaw = normalizeText(req.body?.endDate);
  if (startDateRaw && !parseOptionalDate(startDateRaw)) {
    return res
      .status(400)
      .json({ error: "Start date must be in YYYY-MM-DD format." });
  }
  if (endDateRaw && !parseOptionalDate(endDateRaw)) {
    return res
      .status(400)
      .json({ error: "End date must be in YYYY-MM-DD format." });
  }
  const name = normalizeText(req.body?.name) || tournament.name;
  const location = normalizeText(req.body?.location) || tournament.location;
  const startDate = startDateRaw ? startDateRaw : tournament.start_date;
  const endDate = endDateRaw ? endDateRaw : tournament.end_date;
  const description =
    normalizeText(req.body?.description) || tournament.description;
  tournamentUpdate.run(name, location, startDate, endDate, description, req.params.id);
  const updated = tournamentById.get(req.params.id);
  return res.json({ tournament: mapTournamentRow(updated) });
});

app.post(
  "/api/tournaments/:id/photos",
  requireAdmin,
  upload.single("photo"),
  (req, res) => {
    const tournament = tournamentById.get(req.params.id);
    if (!tournament) {
      if (req.file) removeUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ error: "Tournament not found." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Photo file is required." });
    }
    const caption = normalizeText(req.body?.caption) || null;
    const isCover = req.body?.isCover === "true" || req.body?.isCover === "1";
    const photoId = randomUUID();
    const imagePath = `/uploads/${req.file.filename}`;
    photoInsert.run(
      photoId,
      req.params.id,
      imagePath,
      caption,
      isCover ? 1 : 0,
      new Date().toISOString()
    );
    if (isCover || !tournament.cover_image) {
      photoClearCover.run(req.params.id);
      photoSetCover.run(photoId);
      tournamentUpdateCover.run(imagePath, req.params.id);
    }
    const created = photoById.get(photoId, req.params.id);
    return res.status(201).json({ photo: mapPhotoRow(created) });
  }
);

app.delete("/api/tournaments/:id/photos/:photoId", requireAdmin, (req, res) => {
  const photo = photoById.get(req.params.photoId, req.params.id);
  if (!photo) {
    return res.status(404).json({ error: "Photo not found." });
  }
  photoDelete.run(req.params.photoId, req.params.id);
  removeUploadedFile(photo.image_path);
  if (photo.is_cover) {
    const remaining = photoListByTournament.all(req.params.id);
    if (remaining.length) {
      const nextCover = remaining[0];
      photoClearCover.run(req.params.id);
      photoSetCover.run(nextCover.id);
      tournamentUpdateCover.run(nextCover.image_path, req.params.id);
    } else {
      tournamentUpdateCover.run(null, req.params.id);
    }
  }
  return res.json({ ok: true });
});

app.post(
  "/api/tournaments/:id/results",
  requireAdmin,
  upload.fields([
    { name: "firstPhoto", maxCount: 1 },
    { name: "secondPhoto", maxCount: 1 },
    { name: "thirdPhoto", maxCount: 1 },
  ]),
  (req, res) => {
    const tournament = tournamentById.get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found." });
    }

    const category = normalizeText(req.body?.category);
    const eventDateRaw = normalizeText(req.body?.eventDate);
    if (eventDateRaw && !parseOptionalDate(eventDateRaw)) {
      return res
        .status(400)
        .json({ error: "Event date must be in YYYY-MM-DD format." });
    }
    const eventDate = eventDateRaw || null;
    const firstName = normalizeName(req.body?.firstName);
    const secondName = normalizeName(req.body?.secondName);
    const thirdName = normalizeName(req.body?.thirdName);

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }
    if (!firstName || !secondName || !thirdName) {
      return res
        .status(400)
        .json({ error: "Please provide all three placements." });
    }
    if (new Set([firstName, secondName, thirdName]).size !== 3) {
      return res
        .status(400)
        .json({ error: "Placements must be different players." });
    }
    const existing = eventDate
      ? resultByTournamentCategoryDate.get(req.params.id, category, eventDate)
      : resultByTournamentCategoryNoDate.get(req.params.id, category);
    if (existing) {
      return res.status(409).json({
        error: "Results already exist for this category and date.",
      });
    }

    const firstPhoto = req.files?.firstPhoto?.[0]
      ? `/uploads/${req.files.firstPhoto[0].filename}`
      : null;
    const secondPhoto = req.files?.secondPhoto?.[0]
      ? `/uploads/${req.files.secondPhoto[0].filename}`
      : null;
    const thirdPhoto = req.files?.thirdPhoto?.[0]
      ? `/uploads/${req.files.thirdPhoto[0].filename}`
      : null;

    const resultId = randomUUID();
    resultInsert.run(
      resultId,
      req.params.id,
      category,
      eventDate,
      firstName,
      firstPhoto,
      secondName,
      secondPhoto,
      thirdName,
      thirdPhoto,
      new Date().toISOString()
    );

    const created = resultById.get(resultId, req.params.id);
    return res.status(201).json({ result: mapResultRow(created) });
  }
);

app.delete("/api/tournaments/:id/results/:resultId", requireAdmin, (req, res) => {
  const result = resultById.get(req.params.resultId, req.params.id);
  if (!result) {
    return res.status(404).json({ error: "Result not found." });
  }
  resultDelete.run(req.params.resultId, req.params.id);
  removeUploadedFile(result.first_photo);
  removeUploadedFile(result.second_photo);
  removeUploadedFile(result.third_photo);
  return res.json({ ok: true });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err?.message === "Only image files are allowed.") {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`Leaderboard server running on http://localhost:${PORT}`);
});
