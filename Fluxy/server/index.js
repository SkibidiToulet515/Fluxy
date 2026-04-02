const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const DB = require('./db/database');
const { JWT_SECRET } = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'Fluxy API' }));

// ── Game files ────────────────────────────────────────────────────────────────
// Serve the user's game HTML files from the configured GAMES_DIR
// Default: a "games" folder next to the server. Change GAMES_DIR env var to point
// to wherever you extracted your game files (e.g. "C:\Users\yusof\Downloads\UGS Files")
const GAMES_DIR = process.env.GAMES_DIR || path.join(__dirname, '../games');
app.use('/games', express.static(GAMES_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  }
}));
console.log(`Serving game files from: ${GAMES_DIR}`);

// ── React build ───────────────────────────────────────────────────────────────
const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/games')) {
    res.sendFile(path.join(buildPath, 'index.html'));
    return;
  }

  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.status(404).send('Not found');
});

// ── Socket.io chat ────────────────────────────────────────────────────────────
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Fluxy server running on :${PORT}`));
