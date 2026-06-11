/**
 * routes/settings.js
 *
 * GET /api/settings  — public: fetch safe display settings
 * PUT /api/settings  — admin: update any allowed setting
 */
'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { run, all } = require('../db/database');

const router = express.Router();

const PUBLIC_KEYS = ['whatsapp', 'instagram', 'hero_text_ar', 'hero_sub_ar'];

// ----------------------------------------------------------------
//  GET /api/settings
// ----------------------------------------------------------------
router.get('/', async (_req, res) => {
  try {
    const placeholders = PUBLIC_KEYS.map(() => '?').join(', ');
    const rows = await all(
      `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
      PUBLIC_KEYS
    );
    const result = {};
    rows.forEach(({ key, value }) => { result[key] = value; });
    return res.json(result);
  } catch (err) {
    console.error('[settings GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ----------------------------------------------------------------
//  PUT /api/settings
// ----------------------------------------------------------------
router.put(
  '/',
  requireAdmin,
  [
    body('whatsapp')
      .optional({ checkFalsy: true })
      .trim()
      .isURL({ require_protocol: true })
      .withMessage('whatsapp must be a valid URL (include https://)'),
    body('instagram')
      .optional({ checkFalsy: true })
      .trim()
      .isURL({ require_protocol: true })
      .withMessage('instagram must be a valid URL (include https://)'),
    body('hero_text_ar')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 })
      .escape(),
    body('hero_sub_ar')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 })
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      for (const key of PUBLIC_KEYS) {
        if (req.body[key] !== undefined && req.body[key] !== '') {
          await run(
            `INSERT INTO settings (key, value)
             VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET
               value      = excluded.value,
               updated_at = datetime('now')`,
            [key, req.body[key]]
          );
        }
      }
      return res.json({ success: true, message: 'Settings saved successfully' });
    } catch (err) {
      console.error('[settings PUT]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

module.exports = router;
