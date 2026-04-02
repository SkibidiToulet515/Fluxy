const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const DB = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be 3+ characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be 4+ characters' });
  if (DB.findOne('users', { username })) return res.status(409).json({ error: 'Username already taken' });
  const user = DB.insert('users', { id: uuidv4(), username, password: bcrypt.hashSync(password, 10), role: 'user' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = DB.findOne('users', { username });
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

module.exports = router;
