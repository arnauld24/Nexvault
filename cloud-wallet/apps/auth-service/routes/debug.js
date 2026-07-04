const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Dev-only endpoint: returns decoded token payload for debugging
router.get('/debug/token', authenticateToken, (req, res) => {
  res.json({ success: true, payload: req.user });
});

module.exports = router;
