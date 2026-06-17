'use strict';
/**
 * routes/auth.js
 * POST /api/auth/login   — validate password, issue JWT cookie + body token
 * POST /api/auth/logout  — clear cookie
 * GET  /api/auth/verify  — check if current token is valid
 */

const express      = require('express');
const jwt          = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   24 * 60 * 60 * 1000, // 24 h
};

// POST /api/auth/login
router.post(
  '/login',
  [body('password').notEmpty().trim()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'Password is required' });

    if (req.body.password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ success: false, message: 'Incorrect password' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('admin_token', token, COOKIE_OPTIONS);
    return res.json({ success: true, token, message: 'Login successful' });
  }
);

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('admin_token');
  return res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/verify
router.get('/verify', requireAdmin, (req, res) => {
  return res.json({ success: true, admin: req.admin });
});

module.exports = router;
