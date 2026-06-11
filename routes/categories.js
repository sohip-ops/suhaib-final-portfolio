/**
 * routes/categories.js
 *
 * GET    /api/categories      — public list
 * POST   /api/categories      — admin: create category
 * DELETE /api/categories/:id  — admin: delete category (cannot delete 'all')
 */
'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { run, all, get } = require('../db/database');

const router = express.Router();

// ----------------------------------------------------------------
//  GET /api/categories
// ----------------------------------------------------------------
router.get('/', async (_req, res) => {
  try {
    const rows = await all('SELECT id, name, slug, created_at FROM categories ORDER BY id');
    return res.json(rows);
  } catch (err) {
    console.error('[categories GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ----------------------------------------------------------------
//  POST /api/categories
// ----------------------------------------------------------------
router.post(
  '/',
  requireAdmin,
  [body('name').notEmpty().trim().isLength({ max: 60 }).escape()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const name = req.body.name;
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Invalid category name' });
    }

    try {
      const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
      return res.status(201).json({ success: true, id: result.lastID, name, slug });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ success: false, message: 'Category already exists' });
      }
      console.error('[categories POST]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

// ----------------------------------------------------------------
//  DELETE /api/categories/:id
// ----------------------------------------------------------------
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    try {
      const cat = await get('SELECT slug FROM categories WHERE id = ?', [req.params.id]);
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (cat.slug === 'all') {
        return res.status(403).json({ success: false, message: 'Cannot delete the default category' });
      }

      await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[categories DELETE]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

module.exports = router;
