const express = require('express');
const DB = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/:room', auth, (req, res) => {
  const msgs = DB.getAll('messages')
    .filter(m => m.room === req.params.room)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(-100);
  res.json(msgs);
});

module.exports = router;
