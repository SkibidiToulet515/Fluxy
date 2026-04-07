const express = require('express');
const DB = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/:room', auth, async (req, res) => {
  try {
    const room = String(req.params.room || '').trim().toLowerCase();
    const rows = await DB.getAll('messages');
    const msgs = rows
      .filter((m) => String(m.room || '').trim().toLowerCase() === room)
      .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
      .slice(-100);
    res.json(msgs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load messages', details: error.message });
  }
});

module.exports = router;
