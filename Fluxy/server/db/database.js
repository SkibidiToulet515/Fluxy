const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'fluxy-db.json');

const defaultDb = { users: [], games: [], bookmarklets: [], bypasses: [], messages: [], game_stats: [] };

function readDb() {
  if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2)); return JSON.parse(JSON.stringify(defaultDb)); }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDb(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

let db = readDb();
if (!db.users.find(u => u.username === 'admin')) {
  db.users.push({ id: uuidv4(), username: 'admin', password: bcrypt.hashSync('fluxy_admin_2024', 10), role: 'admin', created_at: Math.floor(Date.now()/1000) });
  console.log('Admin created: admin / fluxy_admin_2024');
}
if (db.games.length === 0) {
  const now = Math.floor(Date.now()/1000);
  db.games = [
    { id: uuidv4(), title: 'Slope', description: 'Navigate a ball down a neon slope at incredible speed', category: 'Action', thumbnail: 'https://images.crazygames.com/slope_16x9/20230607132714/slope_16x9-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://slope-game.github.io/', tags: ['fast','3d','arcade'], play_count: 1420, featured: true, trending: true, created_at: now },
    { id: uuidv4(), title: 'Geometry Dash', description: 'Rhythm-based platformer with intense obstacles', category: 'Action', thumbnail: 'https://images.crazygames.com/geometry-dash/20230919094927/geometry-dash-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://geometrydash.io/', tags: ['music','platformer','hard'], play_count: 980, featured: true, trending: false, created_at: now },
    { id: uuidv4(), title: 'Run 3', description: 'Run through infinite space tunnels', category: 'Action', thumbnail: 'https://images.crazygames.com/run-3-online/20230919100416/run-3-online-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://run3.io/', tags: ['running','space','endless'], play_count: 756, featured: false, trending: true, created_at: now },
    { id: uuidv4(), title: 'Minecraft Classic', description: 'Build and explore in classic block style', category: 'Adventure', thumbnail: 'https://images.crazygames.com/minecraft-classic/20230919100527/minecraft-classic-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://classic.minecraft.net/', tags: ['building','sandbox','survival'], play_count: 2100, featured: true, trending: false, created_at: now },
    { id: uuidv4(), title: '1v1.LOL', description: 'Battle royale with building mechanics', category: '2 Player', thumbnail: 'https://images.crazygames.com/1v1lol/20230919095218/1v1lol-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://1v1.lol/', tags: ['battle','shooting','building'], play_count: 1890, featured: true, trending: true, created_at: now },
    { id: uuidv4(), title: "Five Nights at Freddy's", description: 'Survive the terrifying animatronics', category: 'Horror', thumbnail: 'https://images.crazygames.com/five-nights-at-freddys/20230919095623/five-nights-at-freddys-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://fnaf-game.com/', tags: ['horror','scary','survival'], play_count: 634, featured: false, trending: true, created_at: now },
    { id: uuidv4(), title: 'Retro Bowl', description: 'Retro-style American football', category: 'Action', thumbnail: 'https://images.crazygames.com/retro-bowl/20230919100328/retro-bowl-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://retrobowl.me/', tags: ['sports','football','retro'], play_count: 1100, featured: true, trending: true, created_at: now },
    { id: uuidv4(), title: 'Shell Shockers', description: 'Egg-based first-person shooter', category: '2 Player', thumbnail: 'https://images.crazygames.com/shell-shockers/20230919100149/shell-shockers-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://shellshock.io/', tags: ['shooter','multiplayer','eggs'], play_count: 890, featured: false, trending: true, created_at: now },
    { id: uuidv4(), title: 'Skribbl.io', description: 'Online multiplayer drawing & guessing', category: '2 Player', thumbnail: 'https://images.crazygames.com/skribbl-io/20230919100051/skribbl-io-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://skribbl.io/', tags: ['drawing','multiplayer','guessing'], play_count: 540, featured: false, trending: false, created_at: now },
    { id: uuidv4(), title: 'Cookie Clicker', description: 'The classic idle cookie baking game', category: 'Adventure', thumbnail: 'https://images.crazygames.com/cookie-clicker/20230919095358/cookie-clicker-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://orteil.dashnet.org/cookieclicker/', tags: ['idle','clicker','casual'], play_count: 1560, featured: true, trending: false, created_at: now },
    { id: uuidv4(), title: 'Paper.io 2', description: 'Capture territory in this multiplayer io game', category: '2 Player', thumbnail: 'https://images.crazygames.com/paperio-2/20230919095907/paperio-2-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://paper-io.com/', tags: ['io','multiplayer','territory'], play_count: 720, featured: false, trending: true, created_at: now },
    { id: uuidv4(), title: 'Doki Doki Lit Club', description: 'A psychological horror visual novel', category: 'Horror', thumbnail: 'https://images.crazygames.com/doki-doki-literature-club/20230919095438/doki-doki-literature-club-cover?auto=format%2Ccompress&q=75&cs=strip&ch=DPR&w=600&h=400&fit=crop', url: 'https://ddlc.moe/', tags: ['horror','visual-novel','psychological'], play_count: 312, featured: false, trending: false, created_at: now },
  ];
}
writeDb(db);

const DB = {
  read: readDb, write: writeDb,
  find: (table, query = {}) => { const d = readDb(); return d[table].filter(item => Object.keys(query).every(k => item[k] === query[k])); },
  findOne: (table, query = {}) => { const d = readDb(); return d[table].find(item => Object.keys(query).every(k => item[k] === query[k])) || null; },
  getAll: (table) => readDb()[table],
  insert: (table, record) => { const d = readDb(); if (!record.id) record.id = uuidv4(); if (!record.created_at) record.created_at = Math.floor(Date.now()/1000); d[table].push(record); writeDb(d); return record; },
  update: (table, id, updates) => { const d = readDb(); const i = d[table].findIndex(r => r.id === id); if (i===-1) return null; d[table][i] = {...d[table][i], ...updates}; writeDb(d); return d[table][i]; },
  delete: (table, id) => { const d = readDb(); const before = d[table].length; d[table] = d[table].filter(r => r.id !== id); writeDb(d); return d[table].length < before; },
  increment: (table, id, field) => { const d = readDb(); const i = d[table].findIndex(r => r.id === id); if (i!==-1) { d[table][i][field] = (d[table][i][field]||0)+1; writeDb(d); } },
  count: (table) => readDb()[table].length,
};

module.exports = DB;
