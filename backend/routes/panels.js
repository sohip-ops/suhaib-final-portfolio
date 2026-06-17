'use strict';
/**
 * routes/panels.js
 *
 * GET  /api/panels          — public: list all panels
 * POST /api/panels/upload   — admin: upsert a panel by position
 */

const express      = require('express');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { upload, processAndUpload } = require('../middleware/upload');
const { Panel } = require('../models');

const router = express.Router();
const VALID_POSITIONS = ['left-1', 'left-2', 'right-1', 'right-2'];

// ── GET /api/panels ───────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const panels = await Panel.find().sort({ position: 1 }).lean();
    // Normalise to { position, media_url } so the frontend works unchanged
    return res.json(panels.map(p => ({ position: p.position, media_url: p.mediaUrl })));
  } catch (err) {
    console.error('[panels GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── POST /api/panels/upload ───────────────────────────────────────────────────
router.post(
  '/upload',
  requireAdmin,
  upload.single('media'),
  [body('position').notEmpty().trim()],
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file received' });

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'position field is required' });

    const { position } = req.body;
    if (!VALID_POSITIONS.includes(position))
      return res.status(400).json({
        success: false,
        message: `position must be one of: ${VALID_POSITIONS.join(', ')}`,
      });

    try {
      const { mediaUrl } = await processAndUpload(req.file, 'homepage-panels');

      await Panel.findOneAndUpdate(
        { position },
        { mediaUrl },
        { upsert: true, new: true }
      );

      return res.json({ success: true, url: mediaUrl, position });
    } catch (err) {
      console.error('[panels upload]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
