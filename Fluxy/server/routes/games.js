const express = require("express");
const crypto = require("crypto");
const DB = require("../db/database");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

const CACHE_TTL_MS = 15_000;
let gamesCache = null;
let gamesCacheAt = 0;

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

function parseNonNegativeInt(raw, fallback = 0) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function buildPlayUrl(game) {
  const explicitPlayUrl = toStringSafe(game.playUrl);
  if (explicitPlayUrl) return explicitPlayUrl;

  const externalUrl = toStringSafe(game.url);
  if (externalUrl) return externalUrl;

  const filename = toStringSafe(game.filename) || toStringSafe(game["original file name"]);
  if (filename) {
    return `/games/${encodeURIComponent(filename)}`;
  }

  return "";
}

function normalizeGame(rawGame, statsMap) {
  const name = toStringSafe(rawGame.name) || toStringSafe(rawGame.title) || "Game";
  const playCountFromGame = parseNonNegativeInt(rawGame.play_count, 0);
  const playCountFromStats = parseNonNegativeInt(statsMap.get(rawGame.id), 0);
  const playCount = Math.max(playCountFromGame, playCountFromStats);

  return {
    id: rawGame.id,
    name,
    title: name,
    filename: toStringSafe(rawGame.filename) || toStringSafe(rawGame["original file name"]),
    playUrl: buildPlayUrl(rawGame),
    url: toStringSafe(rawGame.url),
    description: toStringSafe(rawGame.description),
    thumbnail: toStringSafe(rawGame.thumbnail),
    category: toStringSafe(rawGame.category),
    featured: toBoolean(rawGame.featured),
    trending: toBoolean(rawGame.trending),
    play_count: playCount,
  };
}

async function getStatsMap() {
  const rows = await DB.getAll("game_stats");
  const map = new Map();
  for (const row of rows) {
    const id = toStringSafe(row?.id);
    if (!id) continue;
    map.set(id, parseNonNegativeInt(row.plays, 0));
  }
  return map;
}

async function getGames({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && gamesCache && now - gamesCacheAt < CACHE_TTL_MS) {
    return gamesCache;
  }

  const [rawGames, statsMap] = await Promise.all([DB.getAll("games"), getStatsMap()]);
  const normalized = rawGames
    .filter((game) => toStringSafe(game.id))
    .map((game) => normalizeGame(game, statsMap));

  gamesCache = normalized;
  gamesCacheAt = now;
  return normalized;
}

function invalidateGamesCache() {
  gamesCache = null;
  gamesCacheAt = 0;
}

router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 60 } = req.query;
    let games = await getGames();

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
  } catch (error) {
    res.status(500).json({ error: "Failed to load games", details: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    res.json(await getGames());
  } catch (error) {
    res.status(500).json({ error: "Failed to load games", details: error.message });
  }
});

router.post("/:id/play", async (req, res) => {
  try {
    const gameId = String(req.params.id || "").trim();
    if (!gameId) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    await Promise.all([
      DB.increment("game_stats", gameId, "plays"),
      DB.increment("games", gameId, "play_count"),
    ]);

    invalidateGamesCache();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to track game play", details: error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await DB.getAll("game_stats");
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to load stats", details: error.message });
  }
});

router.post("/", adminAuth, async (req, res) => {
  try {
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

    const id = `gn-${crypto.randomBytes(6).toString("hex")}`;
    const record = {
      id,
      name: title,
      title,
      filename,
      url,
      description: toStringSafe(req.body?.description),
      thumbnail: toStringSafe(req.body?.thumbnail),
      category: toStringSafe(req.body?.category),
      featured: toBoolean(req.body?.featured),
      trending: toBoolean(req.body?.trending),
      play_count: parseNonNegativeInt(req.body?.play_count, 0),
    };

    await DB.insert("games", record);
    invalidateGamesCache();
    const games = await getGames({ forceRefresh: true });
    res.status(201).json(games.find((game) => game.id === id));
  } catch (error) {
    res.status(500).json({ error: "Failed to create game", details: error.message });
  }
});

router.put("/:id", adminAuth, async (req, res) => {
  try {
    const gameId = String(req.params.id || "").trim();
    if (!gameId) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    const current = await DB.findOne("games", { id: gameId });
    if (!current) {
      res.status(404).json({ error: "Game not found." });
      return;
    }

    const nextTitle = toStringSafe(req.body?.title) || toStringSafe(req.body?.name) || current.title || current.name;
    const nextFilename = Object.prototype.hasOwnProperty.call(req.body || {}, "filename")
      ? toStringSafe(req.body?.filename)
      : (toStringSafe(current.filename) || toStringSafe(current["original file name"]));
    const nextUrl = Object.prototype.hasOwnProperty.call(req.body || {}, "url")
      ? toStringSafe(req.body?.url)
      : toStringSafe(current.url);

    if (!nextTitle) {
      res.status(400).json({ error: "Title is required." });
      return;
    }

    if (!nextFilename && !nextUrl) {
      res.status(400).json({ error: "A game must have either a filename or URL." });
      return;
    }

    const updates = {
      name: nextTitle,
      title: nextTitle,
      filename: nextFilename,
      url: nextUrl,
      description: Object.prototype.hasOwnProperty.call(req.body || {}, "description")
        ? toStringSafe(req.body?.description)
        : current.description,
      thumbnail: Object.prototype.hasOwnProperty.call(req.body || {}, "thumbnail")
        ? toStringSafe(req.body?.thumbnail)
        : current.thumbnail,
      category: Object.prototype.hasOwnProperty.call(req.body || {}, "category")
        ? toStringSafe(req.body?.category)
        : current.category,
      featured: Object.prototype.hasOwnProperty.call(req.body || {}, "featured")
        ? toBoolean(req.body?.featured)
        : !!current.featured,
      trending: Object.prototype.hasOwnProperty.call(req.body || {}, "trending")
        ? toBoolean(req.body?.trending)
        : !!current.trending,
      play_count: Object.prototype.hasOwnProperty.call(req.body || {}, "play_count")
        ? parseNonNegativeInt(req.body?.play_count, parseNonNegativeInt(current.play_count, 0))
        : parseNonNegativeInt(current.play_count, 0),
    };

    await DB.update("games", gameId, updates);
    invalidateGamesCache();
    const games = await getGames({ forceRefresh: true });
    res.json(games.find((game) => game.id === gameId));
  } catch (error) {
    res.status(500).json({ error: "Failed to update game", details: error.message });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const gameId = String(req.params.id || "").trim();
    const deleted = await DB.delete("games", gameId);
    if (!deleted) {
      res.status(404).json({ error: "Game not found." });
      return;
    }

    await DB.delete("game_stats", gameId);
    invalidateGamesCache();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete game", details: error.message });
  }
});

module.exports = router;
module.exports.getGames = getGames;
