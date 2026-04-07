const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = path.join(__dirname, "fluxy-db.json");
const GAMES_SEED_PATH = path.join(__dirname, "games.json");

const TABLES = ["users", "games", "bookmarklets", "bypasses", "messages", "game_stats"];
const DEFAULT_DB = TABLES.reduce((acc, table) => {
  acc[table] = [];
  return acc;
}, {});

let mode = "json";
let firestore = null;
let fieldValue = null;
let initPromise = null;
let seedPromise = null;
let seedLogged = false;

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function asNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function isFirestoreEnabled() {
  if (process.env.FIRESTORE_ENABLED === "true") return true;
  if (process.env.FIREBASE_CONFIG) return true;
  if (process.env.FUNCTION_TARGET || process.env.K_SERVICE) return true;
  return false;
}

function ensureJsonFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    return deepClone(DEFAULT_DB);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    const next = { ...deepClone(DEFAULT_DB), ...parsed };
    for (const table of TABLES) {
      if (!Array.isArray(next[table])) next[table] = [];
    }
    if (JSON.stringify(next) !== JSON.stringify(parsed)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(next, null, 2), "utf8");
    }
    return next;
  } catch {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    return deepClone(DEFAULT_DB);
  }
}

function readJsonDb() {
  return ensureJsonFile();
}

function writeJsonDb(db) {
  const next = { ...deepClone(DEFAULT_DB), ...(db || {}) };
  for (const table of TABLES) {
    if (!Array.isArray(next[table])) next[table] = [];
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function sanitizeRecord(record) {
  const safe = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (value !== undefined) safe[key] = value;
  }
  return safe;
}

function normalizeSeedGame(entry, index) {
  const title = asString(entry?.name) || asString(entry?.title) || `Game ${index + 1}`;
  const filename =
    asString(entry?.["original file name"]) ||
    asString(entry?.filename) ||
    (asString(entry?.path) ? path.basename(asString(entry.path)) : "");

  return {
    id: asString(entry?.id) || `gn-${index + 1}`,
    name: title,
    title,
    filename,
    url: asString(entry?.url) || asString(entry?.playUrl),
    description: asString(entry?.description),
    thumbnail: asString(entry?.thumbnail),
    category: asString(entry?.category),
    featured: asBoolean(entry?.featured),
    trending: asBoolean(entry?.trending),
    play_count: asNonNegativeInt(entry?.play_count, 0),
    created_at: asNonNegativeInt(entry?.created_at, nowUnix()),
  };
}

function loadSeedGames() {
  if (!fs.existsSync(GAMES_SEED_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(GAMES_SEED_PATH, "utf8"));
    if (!Array.isArray(raw)) return [];
    return raw.map((entry, index) => normalizeSeedGame(entry, index));
  } catch {
    return [];
  }
}

function logSeedInfo(message) {
  if (!seedLogged) {
    console.log(message);
    seedLogged = true;
  }
}

async function initFirestore() {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    const inlineServiceAccount = asString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (inlineServiceAccount) {
      const parsed = JSON.parse(inlineServiceAccount);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    } else {
      admin.initializeApp();
    }
  }

  firestore = admin.firestore();
  fieldValue = admin.firestore.FieldValue;
}

async function init() {
  if (!initPromise) {
    initPromise = (async () => {
      if (isFirestoreEnabled()) {
        try {
          await initFirestore();
          mode = "firestore";
          logSeedInfo("Database mode: Firestore");
        } catch (error) {
          mode = "json";
          console.warn(`Firestore init failed, falling back to JSON DB: ${error.message}`);
        }
      } else {
        mode = "json";
      }

      if (mode === "json") {
        ensureJsonFile();
      }
    })();
  }
  await initPromise;
  await ensureSeedData();
}

async function seedGamesIfNeeded() {
  if (mode === "firestore") {
    const existing = await firestore.collection("games").limit(1).get();
    if (!existing.empty) return;
  } else {
    const db = readJsonDb();
    if (Array.isArray(db.games) && db.games.length > 0) return;
  }

  const seedGames = loadSeedGames();
  if (seedGames.length === 0) return;

  if (mode === "firestore") {
    const chunkSize = 400;
    for (let i = 0; i < seedGames.length; i += chunkSize) {
      const chunk = seedGames.slice(i, i + chunkSize);
      const batch = firestore.batch();
      for (const game of chunk) {
        const docRef = firestore.collection("games").doc(game.id);
        batch.set(docRef, sanitizeRecord(game));
      }
      await batch.commit();
    }
  } else {
    const db = readJsonDb();
    db.games = seedGames;
    writeJsonDb(db);
  }

  console.log(`Seeded ${seedGames.length} games into ${mode}.`);
}

async function ensureAdminUser() {
  const adminUsername = asString(process.env.DEFAULT_ADMIN_USERNAME) || "admin";
  const adminPassword = asString(process.env.DEFAULT_ADMIN_PASSWORD) || "fluxy_admin_2024";
  const usernameLc = adminUsername.toLowerCase();

  let existingAdmin = null;
  if (mode === "firestore") {
    const byLower = await firestore.collection("users").where("username_lc", "==", usernameLc).limit(1).get();
    const byExact = await firestore.collection("users").where("username", "==", adminUsername).limit(1).get();
    existingAdmin = !byLower.empty || !byExact.empty;
  } else {
    const db = readJsonDb();
    existingAdmin = db.users.some(
      (user) => (asString(user.username_lc) === usernameLc) || (asString(user.username) === adminUsername)
    );
  }

  if (existingAdmin) return;

  await insert("users", {
    id: uuidv4(),
    username: adminUsername,
    username_lc: usernameLc,
    password: bcrypt.hashSync(adminPassword, 10),
    role: "admin",
    created_at: nowUnix(),
  });
  console.log(`Admin user created: ${adminUsername} / ${adminPassword}`);
}

async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await ensureAdminUser();
      await seedGamesIfNeeded();
    })();
  }
  await seedPromise;
}

function matchQuery(row, query) {
  return Object.entries(query || {}).every(([key, value]) => row?.[key] === value);
}

async function getAll(table) {
  await init();
  if (!TABLES.includes(table)) return [];

  if (mode === "firestore") {
    const snapshot = await firestore.collection(table).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const db = readJsonDb();
  return deepClone(db[table] || []);
}

async function find(table, query = {}) {
  await init();
  if (!TABLES.includes(table)) return [];

  if (mode === "firestore") {
    let ref = firestore.collection(table);
    for (const [key, value] of Object.entries(query || {})) {
      ref = ref.where(key, "==", value);
    }
    const snapshot = await ref.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const rows = await getAll(table);
  return rows.filter((row) => matchQuery(row, query));
}

async function findOne(table, query = {}) {
  const rows = await find(table, query);
  return rows[0] || null;
}

async function insert(table, record) {
  await init();
  if (!TABLES.includes(table)) return null;

  const base = sanitizeRecord({
    ...record,
    id: asString(record?.id) || uuidv4(),
    created_at: asNonNegativeInt(record?.created_at, nowUnix()),
  });

  if (mode === "firestore") {
    const docRef = firestore.collection(table).doc(base.id);
    await docRef.set(base);
    return base;
  }

  const db = readJsonDb();
  db[table].push(base);
  writeJsonDb(db);
  return base;
}

async function update(table, id, updates) {
  await init();
  if (!TABLES.includes(table) || !asString(id)) return null;

  const cleanUpdates = sanitizeRecord(updates || {});

  if (mode === "firestore") {
    const docRef = firestore.collection(table).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return null;
    await docRef.set(cleanUpdates, { merge: true });
    const next = await docRef.get();
    return { id: next.id, ...next.data() };
  }

  const db = readJsonDb();
  const index = db[table].findIndex((row) => row.id === id);
  if (index < 0) return null;
  db[table][index] = { ...db[table][index], ...cleanUpdates };
  writeJsonDb(db);
  return deepClone(db[table][index]);
}

async function remove(table, id) {
  await init();
  if (!TABLES.includes(table) || !asString(id)) return false;

  if (mode === "firestore") {
    const docRef = firestore.collection(table).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return false;
    await docRef.delete();
    return true;
  }

  const db = readJsonDb();
  const before = db[table].length;
  db[table] = db[table].filter((row) => row.id !== id);
  writeJsonDb(db);
  return db[table].length < before;
}

async function increment(table, id, field) {
  await init();
  if (!TABLES.includes(table) || !asString(id) || !asString(field)) return null;

  if (mode === "firestore") {
    const docRef = firestore.collection(table).doc(id);
    await docRef.set(
      {
        id,
        [field]: fieldValue.increment(1),
      },
      { merge: true }
    );
    const snapshot = await docRef.get();
    return { id: snapshot.id, ...snapshot.data() };
  }

  const db = readJsonDb();
  const index = db[table].findIndex((row) => row.id === id);
  if (index === -1) {
    const created = {
      id,
      [field]: 1,
      created_at: nowUnix(),
    };
    db[table].push(created);
    writeJsonDb(db);
    return deepClone(created);
  }
  const current = asNonNegativeInt(db[table][index][field], 0);
  db[table][index][field] = current + 1;
  writeJsonDb(db);
  return deepClone(db[table][index]);
}

async function count(table) {
  const rows = await getAll(table);
  return rows.length;
}

async function read() {
  await init();
  if (mode === "json") {
    return readJsonDb();
  }
  const output = {};
  for (const table of TABLES) {
    output[table] = await getAll(table);
  }
  return output;
}

async function write(data) {
  await init();
  if (mode !== "json") return false;
  writeJsonDb(data);
  return true;
}

const DB = {
  init,
  mode: () => mode,
  read,
  write,
  find,
  findOne,
  getAll,
  insert,
  update,
  delete: remove,
  increment,
  count,
};

module.exports = DB;
