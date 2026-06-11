/**
 * routes/auth.js
 * POST /api/auth/login   — validate password, issue JWT cookie
 * POST /api/auth/logout  — clear cookie
 * GET  /api/auth/verify  — check if current token is valid
 */
'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',
  maxAge:   24 * 60 * 60 * 1000, // 24 hours in ms
};

// POST /api/auth/login
router.post(
  '/login',
  [body('password').notEmpty().trim()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      // Generic message to avoid leaking information
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // HttpOnly cookie (preferred) + return token for localStorage fallback
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
