const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const DB = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const usernameLc = username.toLowerCase();

    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be 3+ characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be 4+ characters' });

    const existing =
      (await DB.findOne('users', { username_lc: usernameLc })) ||
      (await DB.findOne('users', { username }));
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const user = await DB.insert('users', {
      id: uuidv4(),
      username,
      username_lc: usernameLc,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
    });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const usernameLc = username.toLowerCase();

    const user =
      (await DB.findOne('users', { username_lc: usernameLc })) ||
      (await DB.findOne('users', { username }));

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

module.exports = router;
