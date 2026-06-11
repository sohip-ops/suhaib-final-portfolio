/**
 * routes/portfolio.js
 *
 * GET  /api/portfolio            — public list (filter by ?category= &sub=)
 * GET  /api/portfolio/analytics  — admin: view-count leaderboard  [MUST be before /:id]
 * POST /api/portfolio/upload     — admin: upload a media file
 * POST /api/portfolio/:id/view   — public: increment view counter
 * DELETE /api/portfolio/:id      — admin: delete a media item
 */
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { param, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { upload, processAndUpload } = require('../middleware/upload');
const { run, all, get } = require('../db/database');

const router = express.Router();

// ----------------------------------------------------------------
//  GET /api/portfolio
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  const { category, sub } = req.query;

  let sql = `
    SELECT
      pm.id, pm.sub_label, pm.title, pm.media_url, pm.thumb_url,
      pm.media_type, pm.view_count, pm.created_at,
      c.slug AS cat, c.name AS category_name
    FROM portfolio_media pm
    LEFT JOIN categories c ON pm.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND c.slug = ?';
    params.push(category);
  }
  if (sub && sub !== 'all') {
    sql += ' AND pm.sub_label = ?';
    params.push(sub);
  }
  sql += ' ORDER BY pm.created_at DESC';

  try {
    const rows = await all(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('[portfolio GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ----------------------------------------------------------------
//  GET /api/portfolio/analytics  ← MUST come before /:id routes
// ----------------------------------------------------------------
router.get('/analytics', requireAdmin, async (_req, res) => {
  try {
    const rows = await all(`
      SELECT
        pm.id, pm.title, pm.media_url, pm.thumb_url,
        pm.media_type, pm.view_count, pm.created_at,
        c.name AS category_name
      FROM portfolio_media pm
      LEFT JOIN categories c ON pm.category_id = c.id
      ORDER BY pm.view_count DESC, pm.created_at DESC
      LIMIT 100
    `);
    return res.json(rows);
  } catch (err) {
    console.error('[analytics GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ----------------------------------------------------------------
//  POST /api/portfolio/upload  ← MUST come before /:id routes
// ----------------------------------------------------------------
router.post(
  '/upload',
  requireAdmin,
  upload.single('media'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }

    try {
      const { category_id = null, sub_label = '', title = '' } = req.body;
      const { url, thumb, type } = await processAndUpload(
        req.file.path,
        req.file.mimetype,
        'portfolio'
      );

      const id = uuidv4();
      await run(
        `INSERT INTO portfolio_media
          (id, category_id, sub_label, title, media_url, thumb_url, media_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, category_id || null, sub_label.trim(), title.trim(), url, thumb, type]
      );

      return res.status(201).json({ success: true, id, url, thumb, type });
    } catch (err) {
      console.error('[portfolio upload]', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ----------------------------------------------------------------
//  POST /api/portfolio/:id/view
// ----------------------------------------------------------------
router.post(
  '/:id/view',
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    try {
      await run(
        'UPDATE portfolio_media SET view_count = view_count + 1 WHERE id = ?',
        [req.params.id]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error('[view counter]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

// ----------------------------------------------------------------
//  DELETE /api/portfolio/:id
// ----------------------------------------------------------------
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    try {
      const result = await run(
        'DELETE FROM portfolio_media WHERE id = ?',
        [req.params.id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('[portfolio DELETE]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

module.exports = router;
