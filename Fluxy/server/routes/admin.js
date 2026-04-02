const express = require('express');
const { v4: uuidv4 } = require('uuid');
const DB = require('../db/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/bookmarklets', (req, res) => res.json(DB.getAll('bookmarklets').sort((a,b) => b.created_at - a.created_at)));
router.post('/bookmarklets', adminAuth, (req, res) => {
  const { title, description, code, icon, category } = req.body;
  if (!title || !code) return res.status(400).json({ error: 'Title and code required' });
  res.json(DB.insert('bookmarklets', { id: uuidv4(), title, description: description||'', code, icon: icon||'', category: category||'general' }));
});
router.delete('/bookmarklets/:id', adminAuth, (req, res) => { DB.delete('bookmarklets', req.params.id); res.json({ ok: true }); });

router.get('/bypasses', (req, res) => res.json(DB.getAll('bypasses').sort((a,b) => b.created_at - a.created_at)));
router.post('/bypasses', adminAuth, (req, res) => {
  const { title, description, url, method, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  res.json(DB.insert('bypasses', { id: uuidv4(), title, description: description||'', url: url||'', method: method||'', category: category||'general' }));
});
router.delete('/bypasses/:id', adminAuth, (req, res) => { DB.delete('bypasses', req.params.id); res.json({ ok: true }); });

router.get('/stats', adminAuth, (req, res) => {
  const games = DB.getAll('games');
  res.json({
    users: DB.count('users'),
    games: DB.count('games'),
    messages: DB.count('messages'),
    topGames: games.sort((a,b) => b.play_count - a.play_count).slice(0,5).map(g => ({ title: g.title, play_count: g.play_count }))
  });
});

module.exports = router;
