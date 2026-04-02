const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const DB = require("../db/database");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

// Single source of truth for playable games.
const GAMES_JSON_PATH = path.join(__dirname, "../db/games.json");
let GAME_CACHE = null;

function toStringSafe(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parsePositiveInt(raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function readGamesJson() {
  if (!fs.existsSync(GAMES_JSON_PATH)) {
    return [];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(GAMES_JSON_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeGamesJson(games) {
  fs.writeFileSync(GAMES_JSON_PATH, JSON.stringify(games, null, 2), "utf8");
}

function resolveEntryId(entry, index) {
  const existing = toStringSafe(entry?.id);
  return existing || `gn-${index}`;
}

function buildStatsMap() {
  const rows = DB.getAll("game_stats") || [];
  const map = new Map();
  for (const row of rows) {
    const id = toStringSafe(row?.id);
    if (!id) continue;
    map.set(id, parsePositiveInt(row.plays, 0, 0));
  }
  return map;
}

function normalizeGame(entry, index, statsMap) {
  const id = resolveEntryId(entry, index);
  const name = toStringSafe(entry.name) || toStringSafe(entry.title) || `Game ${index + 1}`;
  const filename = toStringSafe(entry["original file name"]) || toStringSafe(entry.filename);
  const configuredPlayUrl = toStringSafe(entry.playUrl) || toStringSafe(entry.url);
  const playUrl = configuredPlayUrl || (filename ? `/games/${encodeURIComponent(filename)}` : "");
  const storedPlayCount = parsePositiveInt(entry.play_count, 0, 0);
  const playCount = statsMap.has(id) ? statsMap.get(id) : storedPlayCount;

  return {
    id,
    name,
    title: name,
    filename,
    playUrl,
    url: toStringSafe(entry.url),
    description: toStringSafe(entry.description),
    thumbnail: toStringSafe(entry.thumbnail),
    category: toStringSafe(entry.category),
    featured: toBoolean(entry.featured),
    trending: toBoolean(entry.trending),
    play_count: playCount,
  };
}

function loadGames() {
  const rawGames = readGamesJson();
  const statsMap = buildStatsMap();
  return rawGames.map((entry, index) => normalizeGame(entry, index, statsMap));
}

function getGames() {
  if (!GAME_CACHE) {
    GAME_CACHE = loadGames();
  }
  return GAME_CACHE;
}

function refreshGameCache() {
  GAME_CACHE = null;
  return getGames();
}

function findRawGameIndex(rawGames, id) {
  return rawGames.findIndex((entry, index) => resolveEntryId(entry, index) === id);
}

router.get("/", (req, res) => {
  const { search, page = 1, limit = 60 } = req.query;
  let games = getGames();

  if (search && String(search).trim()) {
    const query = String(search).trim().toLowerCase();
    games = games.filter((game) => (game.name || "").toLowerCase().includes(query));
  }

  const total = games.length;
  const pageNum = parsePositiveInt(page, 1, 1);
  const pageSize = parsePositiveInt(limit, 60, 1, 5000);
  const start = (pageNum - 1) * pageSize;
  const results = games.slice(start, start + pageSize);

  res.json({
    total,
    page: pageNum,
    pageSize,
    pages: Math.ceil(total / pageSize),
    games: results,
  });
});

router.get("/all", (req, res) => {
  res.json(getGames());
});

router.post("/:id/play", (req, res) => {
  const gameId = String(req.params.id || "").trim();
  if (!gameId) {
    res.status(400).json({ error: "Invalid game id." });
    return;
  }

  const stats = DB.findOne("game_stats", { id: gameId }) || { id: gameId, plays: 0 };
  DB.update("game_stats", gameId, { plays: (stats.plays || 0) + 1 }) || DB.insert("game_stats", { id: gameId, plays: 1 });
  GAME_CACHE = null;
  res.json({ ok: true });
});

router.get("/stats", (req, res) => {
  const stats = DB.getAll("game_stats") || [];
  res.json(stats);
});

router.post("/", adminAuth, (req, res) => {
  const title = toStringSafe(req.body?.title) || toStringSafe(req.body?.name);
  const filename = toStringSafe(req.body?.filename) || toStringSafe(req.body?.["original file name"]);
  const url = toStringSafe(req.body?.url) || toStringSafe(req.body?.playUrl);

  if (!title) {
    res.status(400).json({ error: "Title is required." });
    return;
  }
  if (!filename && !url) {
    res.status(400).json({ error: "Provide either a local filename or URL." });
    return;
  }

  const rawGames = readGamesJson();
  const id = `gn-${crypto.randomBytes(6).toString("hex")}`;
  const record = {
    id,
    name: title,
    title,
    description: toStringSafe(req.body?.description),
    thumbnail: toStringSafe(req.body?.thumbnail),
    category: toStringSafe(req.body?.category),
    featured: toBoolean(req.body?.featured),
    trending: toBoolean(req.body?.trending),
    play_count: parsePositiveInt(req.body?.play_count, 0, 0),
  };

  if (filename) {
    record["original file name"] = filename;
    record.filename = filename;
  }
  if (url) {
    record.url = url;
  }

  rawGames.push(record);
  writeGamesJson(rawGames);

  const games = refreshGameCache();
  res.status(201).json(games.find((game) => game.id === id));
});

router.put("/:id", adminAuth, (req, res) => {
  const gameId = String(req.params.id || "").trim();
  const rawGames = readGamesJson();
  const index = findRawGameIndex(rawGames, gameId);
  if (index < 0) {
    res.status(404).json({ error: "Game not found." });
    return;
  }

  const entry = { ...rawGames[index] };
  const nextName = toStringSafe(req.body?.title) || toStringSafe(req.body?.name);
  if (nextName) {
    entry.name = nextName;
    entry.title = nextName;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "filename") || Object.prototype.hasOwnProperty.call(req.body || {}, "original file name")) {
    const nextFilename = toStringSafe(req.body?.filename) || toStringSafe(req.body?.["original file name"]);
    if (nextFilename) {
      entry["original file name"] = nextFilename;
      entry.filename = nextFilename;
    } else {
      delete entry["original file name"];
      delete entry.filename;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "url") || Object.prototype.hasOwnProperty.call(req.body || {}, "playUrl")) {
    const nextUrl = toStringSafe(req.body?.url) || toStringSafe(req.body?.playUrl);
    if (nextUrl) {
      entry.url = nextUrl;
    } else {
      delete entry.url;
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "description")) entry.description = toStringSafe(req.body.description);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "thumbnail")) entry.thumbnail = toStringSafe(req.body.thumbnail);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "category")) entry.category = toStringSafe(req.body.category);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "featured")) entry.featured = toBoolean(req.body.featured);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "trending")) entry.trending = toBoolean(req.body.trending);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "play_count")) entry.play_count = parsePositiveInt(req.body.play_count, 0, 0);

  const filename = toStringSafe(entry["original file name"]) || toStringSafe(entry.filename);
  const url = toStringSafe(entry.url);
  if (!filename && !url) {
    res.status(400).json({ error: "A game must have either a filename or URL." });
    return;
  }

  rawGames[index] = entry;
  writeGamesJson(rawGames);
  const games = refreshGameCache();
  res.json(games.find((game) => game.id === gameId));
});

router.delete("/:id", adminAuth, (req, res) => {
  const gameId = String(req.params.id || "").trim();
  const rawGames = readGamesJson();
  const index = findRawGameIndex(rawGames, gameId);
  if (index < 0) {
    res.status(404).json({ error: "Game not found." });
    return;
  }

  rawGames.splice(index, 1);
  writeGamesJson(rawGames);
  DB.delete("game_stats", gameId);
  refreshGameCache();
  res.json({ ok: true });
});

module.exports = router;
module.exports.getGames = getGames;
