'use strict';
/**
 * models/index.js
 * All Mongoose schemas for Suhaib Photo.
 * Replaces the entire SQLite db/ folder.
 */

const mongoose = require('mongoose');

// ── Portfolio ────────────────────────────────────────────────────────────────
// Replaces portfolio_media + categories tables.
// category is stored as a plain string (e.g. 'people', 'cars') — no separate
// collection needed; the admin can create/remove tags freely.
const portfolioSchema = new mongoose.Schema({
  title:       { type: String, default: '', trim: true, maxlength: 200 },
  subLabel:    { type: String, default: '', trim: true, maxlength: 100 },
  mediaUrl:    { type: String, required: true },
  thumbUrl:    { type: String, default: '' },
  mediaType:   { type: String, enum: ['image', 'video'], required: true },
  category:    { type: String, default: 'uncategorized', trim: true, lowercase: true },
  viewCount:   { type: Number, default: 0 },
}, { timestamps: true });

// Index for fast category filtering
portfolioSchema.index({ category: 1, createdAt: -1 });

// ── Categories ───────────────────────────────────────────────────────────────
// Simple name/slug pairs for the admin UI category dropdown.
const categorySchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  nameAr:   { type: String, default: '',   trim: true, maxlength: 60 },  // Arabic label
  nameEn:   { type: String, default: '',   trim: true, maxlength: 60 },  // English label
  slug:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

// ── Homepage Panels ───────────────────────────────────────────────────────────
const panelSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true,
    unique: true,
    enum: ['left-1', 'left-2', 'right-1', 'right-2'],
  },
  mediaUrl: { type: String, required: true },
}, { timestamps: true });

// ── Settings (singleton — upserted by key='main') ─────────────────────────────
// Stores social links and hero text.  One document, key = 'main'.
const settingsSchema = new mongoose.Schema({
  key:         { type: String, default: 'main', unique: true },
  whatsapp:    { type: String, default: 'https://wa.me/966500000000', trim: true },
  instagram:   { type: String, default: 'https://instagram.com/suhaibphoto', trim: true },
  heroTextAr:  { type: String, default: '..جودة بصرية تليق بك',   trim: true, maxlength: 300 },
  heroSubAr:   { type: String, default: 'حكايات ترويها العدسة',    trim: true, maxlength: 300 },
  heroTextEn:  { type: String, default: 'Visual quality you deserve..', trim: true, maxlength: 300 },
  heroSubEn:   { type: String, default: 'Stories told through the lens', trim: true, maxlength: 300 },
}, { timestamps: true });

module.exports = {
  Portfolio: mongoose.model('Portfolio', portfolioSchema),
  Category:  mongoose.model('Category',  categorySchema),
  Panel:     mongoose.model('Panel',      panelSchema),
  Settings:  mongoose.model('Settings',  settingsSchema),
};
