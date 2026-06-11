/**
 * routes/panels.js
 *
 * GET  /api/panels         — public: list all panels
 * POST /api/panels/upload  — admin: upsert a panel by position
 */
'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { upload, processAndUpload } = require('../middleware/upload');
const { run, all } = require('../db/database');

const router = express.Router();

const VALID_POSITIONS = ['left-1', 'left-2', 'right-1', 'right-2'];

// ----------------------------------------------------------------
//  GET /api/panels
// ----------------------------------------------------------------
router.get('/', async (_req, res) => {
  try {
    const rows = await all('SELECT * FROM homepage_panels ORDER BY position');
    return res.json(rows);
  } catch (err) {
    console.error('[panels GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ----------------------------------------------------------------
//  POST /api/panels/upload
// ----------------------------------------------------------------
router.post(
  '/upload',
  requireAdmin,
  upload.single('media'),
  [body('position').notEmpty().trim()],
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'position field is required' });
    }

    const { position } = req.body;
    if (!VALID_POSITIONS.includes(position)) {
      return res.status(400).json({
        success: false,
        message: `position must be one of: ${VALID_POSITIONS.join(', ')}`,
      });
    }

    try {
      const { url } = await processAndUpload(req.file.path, req.file.mimetype, 'homepage-panels');

      await run(
        `INSERT INTO homepage_panels (position, media_url)
         VALUES (?, ?)
         ON CONFLICT(position) DO UPDATE SET
           media_url  = excluded.media_url,
           updated_at = datetime('now')`,
        [position, url]
      );

      return res.json({ success: true, url, position });
    } catch (err) {
      console.error('[panels upload]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
