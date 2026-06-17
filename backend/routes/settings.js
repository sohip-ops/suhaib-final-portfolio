'use strict';
/**
 * routes/settings.js
 *
 * GET /api/settings  — public: returns social links + hero text
 * PUT /api/settings  — admin: update settings
 *
 * Both WhatsApp and Instagram are always returned as fully-formed https:// URLs.
 * Admin can supply a raw phone number or @handle — server normalises them.
 */

const express      = require('express');
const { body, validationResult } = require('express-validator');
const requireAdmin = require('../middleware/auth');
const { Settings } = require('../models');

const router = express.Router();

// ── Normalisation helpers ─────────────────────────────────────────────────────
function normaliseWhatsApp(value) {
  if (!value) return 'https://wa.me/966500000000';
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : 'https://wa.me/966500000000';
}

function normaliseInstagram(value) {
  if (!value) return 'https://instagram.com/suhaibphoto';
  let v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  v = v.replace(/^@/, '');
  if (/^instagram\.com/i.test(v)) return `https://${v}`;
  return v ? `https://instagram.com/${v}` : 'https://instagram.com/suhaibphoto';
}

// ── Ensure singleton settings doc exists ─────────────────────────────────────
async function getSettings() {
  let doc = await Settings.findOne({ key: 'main' });
  if (!doc) doc = await Settings.create({ key: 'main' });
  return doc;
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const s = await getSettings();
    return res.json({
      whatsapp:     normaliseWhatsApp(s.whatsapp),
      instagram:    normaliseInstagram(s.instagram),
      hero_text_ar: s.heroTextAr  || '..جودة بصرية تليق بك',
      hero_sub_ar:  s.heroSubAr   || 'حكايات ترويها العدسة',
      hero_text_en: s.heroTextEn  || 'Visual quality you deserve..',
      hero_sub_en:  s.heroSubEn   || 'Stories told through the lens',
    });
  } catch (err) {
    console.error('[settings GET]', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
router.put(
  '/',
  requireAdmin,
  [
    body('whatsapp')
      .optional({ checkFalsy: true })
      .trim()
      .customSanitizer(v => normaliseWhatsApp(v))
      .isURL({ require_protocol: true })
      .withMessage('WhatsApp must be a valid URL or phone number'),
    body('instagram')
      .optional({ checkFalsy: true })
      .trim()
      .customSanitizer(v => normaliseInstagram(v))
      .isURL({ require_protocol: true })
      .withMessage('Instagram must be a valid URL or @handle'),
    body('hero_text_ar').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
    body('hero_sub_ar').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
    body('hero_text_en').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
    body('hero_sub_en').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const update = {};
      if (req.body.whatsapp)     update.whatsapp   = req.body.whatsapp;
      if (req.body.instagram)    update.instagram  = req.body.instagram;
      if (req.body.hero_text_ar) update.heroTextAr = req.body.hero_text_ar;
      if (req.body.hero_sub_ar)  update.heroSubAr  = req.body.hero_sub_ar;
      if (req.body.hero_text_en) update.heroTextEn = req.body.hero_text_en;
      if (req.body.hero_sub_en)  update.heroSubEn  = req.body.hero_sub_en;

      if (Object.keys(update).length === 0)
        return res.status(400).json({ success: false, message: 'No fields provided to update' });

      await Settings.findOneAndUpdate(
        { key: 'main' },
        { $set: update },
        { upsert: true, new: true }
      );

      return res.json({ success: true, message: 'Settings saved successfully' });
    } catch (err) {
      console.error('[settings PUT]', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }
);

module.exports = router;
