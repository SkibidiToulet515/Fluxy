const express = require('express');
const { v4: uuidv4 } = require('uuid');
const DB = require('../db/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/bookmarklets', async (req, res) => {
  try {
    const rows = await DB.getAll('bookmarklets');
    res.json(rows.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load bookmarklets', details: error.message });
  }
});

router.post('/bookmarklets', adminAuth, async (req, res) => {
  try {
    const { title, description, code, icon, category } = req.body;
    if (!title || !code) return res.status(400).json({ error: 'Title and code required' });
    const created = await DB.insert('bookmarklets', {
      id: uuidv4(),
      title,
      description: description || '',
      code,
      icon: icon || '',
      category: category || 'general'
    });
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bookmarklet', details: error.message });
  }
});

router.delete('/bookmarklets/:id', adminAuth, async (req, res) => {
  try {
    await DB.delete('bookmarklets', req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bookmarklet', details: error.message });
  }
});

router.get('/bypasses', async (req, res) => {
  try {
    const rows = await DB.getAll('bypasses');
    res.json(rows.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load bypasses', details: error.message });
  }
});

router.post('/bypasses', adminAuth, async (req, res) => {
  try {
    const { title, description, url, method, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const created = await DB.insert('bypasses', {
      id: uuidv4(),
      title,
      description: description || '',
      url: url || '',
      method: method || '',
      category: category || 'general'
    });
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bypass entry', details: error.message });
  }
});

router.delete('/bypasses/:id', adminAuth, async (req, res) => {
  try {
    await DB.delete('bypasses', req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bypass entry', details: error.message });
  }
});

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [games, usersCount, gamesCount, messagesCount] = await Promise.all([
      DB.getAll('games'),
      DB.count('users'),
      DB.count('games'),
      DB.count('messages'),
    ]);

    res.json({
      users: usersCount,
      games: gamesCount,
      messages: messagesCount,
      topGames: games
        .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
        .slice(0, 5)
        .map((g) => ({ title: g.title || g.name, play_count: g.play_count || 0 }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load admin stats', details: error.message });
  }
});

module.exports = router;
