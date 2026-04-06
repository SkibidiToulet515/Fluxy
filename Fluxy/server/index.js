const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { server: wispServer } = require('@mercuryworkshop/wisp-js/server');
const DB = require('./db/database');
const { JWT_SECRET } = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

function isDirectory(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function withProxyHeaders(res) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

function proxyStatic(dirPath) {
  return express.static(dirPath, {
    setHeaders: (res) => {
      withProxyHeaders(res);
    }
  });
}

function resolveDistFromEntry(entrySpecifier, entryIsInsideLibFolder = false) {
  const resolvedPath = require.resolve(entrySpecifier);
  const resolvedDir = path.dirname(resolvedPath);
  if (!entryIsInsideLibFolder) {
    return resolvedDir;
  }
  return path.join(resolvedDir, '..', 'dist');
}

function sendProxyFile(res, fileName, contentType) {
  const fullPath = path.join(__dirname, 'proxy-launchers', fileName);
  if (!fs.existsSync(fullPath)) {
    res.status(500).json({ error: `Missing proxy launcher file: ${fileName}` });
    return;
  }
  withProxyHeaders(res);
  res.setHeader('Cache-Control', 'no-store');
  if (contentType) {
    res.type(contentType);
  }
  res.sendFile(fullPath);
}

const UV_DIST = resolveDistFromEntry('@titaniumnetwork-dev/ultraviolet', true);
const BAREMUX_DIST = resolveDistFromEntry('@mercuryworkshop/bare-mux/node', true);
const SCRAMJET_DIST = resolveDistFromEntry('@mercuryworkshop/scramjet', true);
const EPOXY_DIST = resolveDistFromEntry('@mercuryworkshop/epoxy-transport');
const LIBCURL_DIST = resolveDistFromEntry('@mercuryworkshop/libcurl-transport');

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/proxy', require('./routes/proxy'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'Fluxy API' }));

// Engine static mounts (Ultraviolet + Scramjet)
const engineMounts = [
  ['/uv', UV_DIST],
  ['/epoxy', EPOXY_DIST],
  ['/baremux', BAREMUX_DIST],
  ['/scram', SCRAMJET_DIST],
  ['/libcurl', LIBCURL_DIST],
];

for (const [routePrefix, dirPath] of engineMounts) {
  if (isDirectory(dirPath)) {
    app.use(routePrefix, proxyStatic(dirPath));
    console.log(`Serving ${routePrefix} assets from: ${dirPath}`);
  } else {
    console.warn(`Missing engine assets for ${routePrefix}: ${dirPath}`);
  }
}

app.get('/proxy/launch/uv', (req, res) => sendProxyFile(res, 'uv-launcher.html', 'html'));
app.get('/proxy/launch/scramjet', (req, res) => sendProxyFile(res, 'scramjet-launcher.html', 'html'));
app.get('/scramjet/sw.js', (req, res) => sendProxyFile(res, 'scramjet-sw.js', 'application/javascript'));

// Game files
const gameDirCandidates = [
  process.env.GAMES_DIR,
  path.join(__dirname, '../client/UGS Files'),
  path.join(process.cwd(), 'client/UGS Files'),
  path.join(__dirname, '../games'),
].filter(Boolean);

const GAMES_DIR = gameDirCandidates.find(isDirectory) || gameDirCandidates[gameDirCandidates.length - 1];
if (!isDirectory(GAMES_DIR)) {
  console.warn(`Game directory does not exist: ${GAMES_DIR}`);
}

app.use('/games', express.static(GAMES_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  }
}));
console.log(`Serving game files from: ${GAMES_DIR}`);

// React build
const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
  const nonSpaPrefixes = [
    '/api',
    '/socket.io',
    '/games',
    '/uv',
    '/epoxy',
    '/baremux',
    '/scram',
    '/libcurl',
    '/proxy/launch',
    '/scramjet',
    '/wisp',
  ];

  const isSpaRoute = !nonSpaPrefixes.some((prefix) => req.path.startsWith(prefix));
  if (isSpaRoute) {
    res.sendFile(path.join(buildPath, 'index.html'));
    return;
  }

  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.status(404).send('Not found');
});

// Socket.io chat
const onlineUsers = new Map();
const CHAT_ROOMS = new Set(['general', 'gaming', 'help']);

io.on('connection', (socket) => {
  socket.on('auth', (token) => {
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      onlineUsers.set(socket.id, user.username);
      io.emit('online_count', onlineUsers.size);
      socket.emit('auth_ok', user);
    } catch {
      socket.emit('auth_error');
    }
  });

  socket.on('join_room', (room) => {
    if (!socket.user) return;

    const requestedRoom = String(room || '').trim().toLowerCase();
    if (!CHAT_ROOMS.has(requestedRoom)) {
      socket.emit('auth_error');
      return;
    }

    if (socket.currentRoom === requestedRoom) return;

    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      socket.to(socket.currentRoom).emit('user_left', { username: socket.user.username });
    }

    socket.join(requestedRoom);
    socket.currentRoom = requestedRoom;
    socket.to(requestedRoom).emit('user_joined', { username: socket.user.username });
  });

  socket.on('message', ({ content, room }) => {
    if (!socket.user || !content?.trim()) return;
    const msg = {
      id: uuidv4(),
      user_id: socket.user.id,
      username: socket.user.username,
      content: content.trim().substring(0, 500),
      room: room || 'general',
      created_at: Math.floor(Date.now() / 1000)
    };
    DB.insert('messages', msg);
    io.to(msg.room).emit('message', msg);
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom && socket.user) {
      socket.to(socket.currentRoom).emit('user_left', { username: socket.user.username });
    }
    onlineUsers.delete(socket.id);
    io.emit('online_count', onlineUsers.size);
  });
});

// Wisp websocket endpoint for Ultraviolet/Scramjet transports
server.on('upgrade', (req, socket, head) => {
  if (typeof req.url === 'string' && req.url.endsWith('/wisp/')) {
    wispServer.routeRequest(req, socket, head);
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Fluxy server running on :${PORT}`));