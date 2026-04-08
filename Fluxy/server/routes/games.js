const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const DB = require("../db/database");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

// Single source of truth for playable games.
const GAMES_JSON_PATH = path.join(__dirname, "../db/games.json");
const MAX_THUMBNAIL_SCAN_BYTES = 220 * 1024;
const THUMBNAIL_CACHE = new Map();
const FALLBACK_PALETTES = [
  ["#6E56FF", "#A07BFF", "#1D1640"],
  ["#FF56B8", "#FF8FD2", "#3A102C"],
  ["#50A0DC", "#8BC7EF", "#10293B"],
  ["#FF64A0", "#FF97C0", "#3D1027"],
  ["#50C8A0", "#7AE0BD", "#10372B"],
  ["#FFB41E", "#FFD16B", "#3D2B08"],
  ["#BE78FF", "#D8ABFF", "#2B163F"],
  ["#FF3C1E", "#FF846E", "#3B120C"],
  ["#82A0FF", "#ADC1FF", "#18264A"],
  ["#00FFB4", "#7BFFD7", "#08362A"],
];

function isDirectory(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

const gameDirCandidates = [
  process.env.GAMES_DIR,
  path.join(__dirname, "../../client/UGS Files"),
  path.join(process.cwd(), "client/UGS Files"),
  path.join(__dirname, "../../games"),
].filter(Boolean);

const GAMES_DIR = gameDirCandidates.find(isDirectory) || gameDirCandidates[gameDirCandidates.length - 1];
let GAME_CACHE = null;

function toStringSafe(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hashString(input) {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parsePositiveInt(raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isGenericFaviconHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host.endsWith(".googleusercontent.com") ||
    host.endsWith(".gstatic.com") ||
    host === "googletagmanager.com" ||
    host.endsWith(".googletagmanager.com")
  );
}

function encodeGamesPath(filePath) {
  const normalized = toStringSafe(filePath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";
  return normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toGameAssetRoute(filePath) {
  const encoded = encodeGamesPath(filePath);
  return encoded ? `/games/${encoded}` : "";
}

function resolveGameFilePath(filename) {
  const raw = toStringSafe(filename);
  if (!raw) return "";

  const decoded = safeDecodeURIComponent(raw).replace(/\\/g, "/");
  const candidate = path.resolve(GAMES_DIR, decoded);
  const root = path.resolve(GAMES_DIR);

  if (!candidate.startsWith(root)) {
    return "";
  }

  return candidate;
}

function readFileSnippet(filePath, maxBytes = MAX_THUMBNAIL_SCAN_BYTES) {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
      if (bytesRead <= 0) return "";
      return buffer.toString("utf8", 0, bytesRead);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function extractThumbnailReferenceFromHtml(html) {
  if (!html) return "";

  const socialImage = firstMatch(html, [
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["'][^>]*content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["']/i,
  ]);
  if (socialImage) return socialImage;

  const iconHref = firstMatch(html, [
    /<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']/i,
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i,
  ]);
  if (iconHref) return iconHref;

  const imageSrc = firstMatch(html, [/<img[^>]+src\s*=\s*["']([^"']+)["']/i]);
  if (imageSrc) return imageSrc;

  const genericImageAsset = firstMatch(html, [
    /(?:src|href|content)\s*=\s*["']([^"']+\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?[^"']*)?)["']/i,
    /url\((?:["']?)([^)"']+\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?[^)"']*)?)(?:["']?)\)/i,
  ]);
  if (genericImageAsset) return genericImageAsset;

  const baseHref = firstMatch(html, [/<base[^>]+href\s*=\s*["']([^"']+)["']/i]);
  if (isHttpUrl(baseHref)) {
    try {
      const base = new URL(baseHref);
      if (!isGenericFaviconHost(base.hostname)) {
        return new URL("favicon.ico", base).toString();
      }
    } catch {
      // fall through
    }
  }

  return "";
}

function normalizeThumbnailReference(reference, filename) {
  const raw = toStringSafe(reference);
  if (!raw) return "";

  if (/^data:image\//i.test(raw)) {
    // Keep very small inline icons only to avoid oversized API payloads.
    return raw.length <= 4096 ? raw : "";
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const pathName = parsed.pathname.toLowerCase();
      const externalLooksLikeFavicon = /\/favicon(?:\.[a-z0-9]+)?$/i.test(pathName) || /favicon/i.test(pathName);
      if (isGenericFaviconHost(parsed.hostname)) {
        return "";
      }
      if (externalLooksLikeFavicon) {
        return "";
      }
    } catch {
      return "";
    }
    return raw;
  }

  if (/^\/\//.test(raw)) {
    return `https:${raw}`;
  }

  if (/^(javascript:|about:|#)/i.test(raw)) {
    return "";
  }

  const withoutHash = raw.split("#")[0];
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
  const assetPath = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  const gamePath = toStringSafe(filename).replace(/\\/g, "/");
  const gameDir = path.posix.dirname(gamePath);
  const merged = assetPath.startsWith("/")
    ? assetPath.slice(1)
    : path.posix.join(gameDir === "." ? "" : gameDir, assetPath);

  const normalized = path.posix.normalize(merged).replace(/^\/+/, "");
  if (!normalized || normalized.startsWith("..")) {
    return "";
  }

  const encoded = normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!encoded) {
    return "";
  }

  return `/games/${encoded}${query}`;
}

function resolveThumbnailFromUrl(url) {
  if (!isHttpUrl(url)) return "";
  try {
    const parsed = new URL(url);
    if (isGenericFaviconHost(parsed.hostname)) {
      return "";
    }
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function buildFallbackThumbnail(gameName, gameId, filename) {
  const safeName = toStringSafe(gameName) || "Game";
  const label = safeName.length > 26 ? `${safeName.slice(0, 26)}...` : safeName;
  const seed = hashString(`${safeName}|${toStringSafe(gameId)}|${toStringSafe(filename)}`);
  const palette = FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length];
  const accent = palette[0];
  const glow = palette[1];
  const bg = palette[2];

  const shapeA = 80 + (seed % 120);
  const shapeB = 100 + ((seed >> 6) % 180);
  const shapeC = 120 + ((seed >> 12) % 260);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${bg}" />
    <stop offset="100%" stop-color="${accent}" />
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="35%" r="60%">
    <stop offset="0%" stop-color="${glow}" stop-opacity="0.65" />
    <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
  </radialGradient>
</defs>
<rect width="640" height="400" fill="url(#bg)" />
<circle cx="${shapeC}" cy="${shapeA}" r="140" fill="url(#glow)" />
<rect x="20" y="20" width="600" height="360" rx="18" fill="none" stroke="rgba(255,255,255,0.18)" />
<g transform="translate(320 170)">
  <rect x="-120" y="-60" width="240" height="120" rx="34" fill="rgba(255,255,255,0.16)" />
  <rect x="-70" y="-11" width="58" height="20" rx="10" fill="rgba(255,255,255,0.88)" />
  <rect x="-50" y="-31" width="18" height="60" rx="9" fill="rgba(255,255,255,0.88)" />
  <circle cx="45" cy="-10" r="12" fill="rgba(255,255,255,0.88)" />
  <circle cx="72" cy="14" r="12" fill="rgba(255,255,255,0.88)" />
  <path d="M -${shapeA / 4} ${shapeB / 10} Q 0 ${shapeA / 3} ${shapeA / 4} ${shapeB / 10}" stroke="rgba(255,255,255,0.4)" stroke-width="4" fill="none" />
</g>
<text x="320" y="332" text-anchor="middle" fill="white" opacity="0.94" font-family="Arial, sans-serif" font-size="30" font-weight="700">${escapeXml(label)}</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function resolveGameThumbnail(filename, configuredUrl, gameName, gameId) {
  const cacheKey = `${toStringSafe(filename)}|${toStringSafe(configuredUrl)}|${toStringSafe(gameName)}|${toStringSafe(gameId)}`;
  if (THUMBNAIL_CACHE.has(cacheKey)) {
    return THUMBNAIL_CACHE.get(cacheKey);
  }

  let resolved = "";
  const filePath = resolveGameFilePath(filename);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const snippet = readFileSnippet(filePath);
    const reference = extractThumbnailReferenceFromHtml(snippet);
    resolved = normalizeThumbnailReference(reference, filename);
  }

  if (!resolved) {
    resolved = buildFallbackThumbnail(gameName, gameId, filename);
  }

  THUMBNAIL_CACHE.set(cacheKey, resolved);
  return resolved;
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

async function buildStatsMap() {
  const rows = await DB.getAll("game_stats");
  const map = new Map();
  for (const row of rows || []) {
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
  const playUrl = configuredPlayUrl || toGameAssetRoute(filename);
  const storedPlayCount = parsePositiveInt(entry.play_count, 0, 0);
  const playCount = statsMap.has(id) ? statsMap.get(id) : storedPlayCount;
  const explicitThumbnail = toStringSafe(entry.thumbnail);
  const thumbnail = explicitThumbnail || resolveGameThumbnail(filename, configuredPlayUrl, name, id);

  return {
    id,
    name,
    title: name,
    filename,
    playUrl,
    url: toStringSafe(entry.url),
    description: toStringSafe(entry.description),
    thumbnail,
    category: toStringSafe(entry.category),
    featured: toBoolean(entry.featured),
    trending: toBoolean(entry.trending),
    play_count: playCount,
  };
}

function dedupeGames(games) {
  const seen = new Set();
  const unique = [];

  for (const game of games) {
    const filename = toStringSafe(game?.filename).toLowerCase();
    const playUrl = toStringSafe(game?.playUrl).toLowerCase();
    const name = toStringSafe(game?.name).toLowerCase();
    const id = toStringSafe(game?.id).toLowerCase();
    const dedupeKey = `${filename}|${playUrl}|${name}`;
    const key = dedupeKey === "||" ? `id:${id}` : dedupeKey;

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(game);
  }

  return unique;
}

async function loadGames() {
  const rawGames = readGamesJson();
  const statsMap = await buildStatsMap();
  const normalized = rawGames.map((entry, index) => normalizeGame(entry, index, statsMap));
  return dedupeGames(normalized);
}

async function getGames() {
  if (!GAME_CACHE) {
    GAME_CACHE = await loadGames();
  }
  return GAME_CACHE;
}

async function refreshGameCache() {
  GAME_CACHE = null;
  THUMBNAIL_CACHE.clear();
  return getGames();
}

function findRawGameIndex(rawGames, id) {
  return rawGames.findIndex((entry, index) => resolveEntryId(entry, index) === id);
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

    const stats = await DB.findOne("game_stats", { id: gameId });
    if (stats) {
      await DB.update("game_stats", gameId, { plays: (stats.plays || 0) + 1 });
    } else {
      await DB.insert("game_stats", { id: gameId, plays: 1 });
    }

    GAME_CACHE = null;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to track game play", details: error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await DB.getAll("game_stats");
    res.json(stats || []);
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

    const games = await refreshGameCache();
    res.status(201).json(games.find((game) => game.id === id));
  } catch (error) {
    res.status(500).json({ error: "Failed to create game", details: error.message });
  }
});

router.put("/:id", adminAuth, async (req, res) => {
  try {
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
    const games = await refreshGameCache();
    res.json(games.find((game) => game.id === gameId));
  } catch (error) {
    res.status(500).json({ error: "Failed to update game", details: error.message });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const gameId = String(req.params.id || "").trim();
    const rawGames = readGamesJson();
    const index = findRawGameIndex(rawGames, gameId);
    if (index < 0) {
      res.status(404).json({ error: "Game not found." });
      return;
    }

    rawGames.splice(index, 1);
    writeGamesJson(rawGames);
    await DB.delete("game_stats", gameId);
    await refreshGameCache();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete game", details: error.message });
  }
});

module.exports = router;
module.exports.getGames = getGames;
