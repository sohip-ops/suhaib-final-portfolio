'use strict';
/**
 * routes/portfolio.js
 *
 * GET    /api/portfolio              — public list (?category=slug&sub=label)
 * GET    /api/portfolio/analytics    — admin: view-count leaderboard
 * POST   /api/portfolio/upload       — admin: upload media (multipart/form-data, field: media)
 * POST   /api/portfolio/:id/view     — public: increment view counter
 * DELETE /api/portfolio/:id          — admin: delete item
 */

const express      = require('express');
const { param, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { upload, processAndUpload } = require('../middleware/upload');
const { Portfolio } = require('../models');

const router = express.Router();

// ── GET /api/portfolio ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'all')
      filter.category = req.query.category.toLowerCase();
    if (req.query.sub && req.query.sub !== 'all')
      filter.subLabel = req.query.sub;

    const items = await Portfolio.find(filter).sort({ createdAt: -1 }).lean();

    // Normalise field names so the existing frontend (which uses media_url, thumb_url,
    // view_count, media_type, created_at) works without any HTML/JS changes.
    const normalised = items.map(normaliseItem);
    return res.json(normalised);
  } catch (err) {
    console.error('[portfolio GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── GET /api/portfolio/analytics  (MUST be before /:id) ──────────────────────
router.get('/analytics', requireAdmin, async (_req, res) => {
  try {
    const items = await Portfolio
      .find()
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(100)
      .lean();
    return res.json(items.map(normaliseItem));
  } catch (err) {
    console.error('[analytics GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── POST /api/portfolio/upload  (MUST be before /:id) ────────────────────────
// FIX #3: multer field name is 'media' (matching the admin FormData.append('media', file))
router.post(
  '/upload',
  requireAdmin,
  upload.single('media'),   // ← field name must match fd.append('media', file) in admin.html
  async (req, res) => {
    // FIX #3: explicit check with clear message
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received — ensure the FormData field is named "media"' });
    }

    try {
      const { category = 'uncategorized', sub_label = '', title = '' } = req.body;

      // FIX #4: processAndUpload sends buffer to Cloudinary, returns permanent URLs
      const { mediaUrl, thumbUrl, mediaType } = await processAndUpload(req.file, 'portfolio');

      const doc = await Portfolio.create({
        title:     (title || req.file.originalname.replace(/\.[^/.]+$/, '')).trim(),
        subLabel:  sub_label.trim(),
        category:  category.trim().toLowerCase(),
        mediaUrl,
        thumbUrl,
        mediaType,
      });

      return res.status(201).json({ success: true, ...normaliseItem(doc.toObject()) });
    } catch (err) {
      console.error('[portfolio upload]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── POST /api/portfolio/:id/view ──────────────────────────────────────────────
router.post('/:id/view', async (req, res) => {
  try {
    await Portfolio.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[view counter]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── DELETE /api/portfolio/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const doc = await Portfolio.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[portfolio DELETE]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── Helper: map Mongoose doc → shape the existing frontend expects ─────────────
function normaliseItem(doc) {
  return {
    id:            doc._id,
    title:         doc.title        || '',
    sub_label:     doc.subLabel     || '',
    media_url:     doc.mediaUrl,
    thumb_url:     doc.thumbUrl     || doc.mediaUrl,
    media_type:    doc.mediaType,
    cat:           doc.category,
    category_name: doc.category,
    view_count:    doc.viewCount    || 0,
    created_at:    doc.createdAt,
  };
}

module.exports = router;
