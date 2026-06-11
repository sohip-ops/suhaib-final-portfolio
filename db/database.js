/**
 * db/database.js
 * Initialises SQLite database and creates all tables.
 * Uses sqlite3 (async, pre-compiled — no C++ build tools required).
 */
'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH  = path.join(DATA_DIR, 'suhaib.db');

// Ensure data/ directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Create/open the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌  Failed to open database:', err.message);
    process.exit(1);
  }
});

// ----------------------------------------------------------------
//  Helper: run a single statement and return a Promise
// ----------------------------------------------------------------
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// ----------------------------------------------------------------
//  Helper: fetch all rows
// ----------------------------------------------------------------
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ----------------------------------------------------------------
//  Helper: fetch a single row
// ----------------------------------------------------------------
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ----------------------------------------------------------------
//  Helper: run multiple statements separated by semicolons
//  (sqlite3 does not support multi-statement exec out of the box)
// ----------------------------------------------------------------
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ----------------------------------------------------------------
//  Helper: run a list of statements inside a serialised block
// ----------------------------------------------------------------
function serialize(fn) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      try { fn(); resolve(); }
      catch (err) { reject(err); }
    });
  });
}

// ----------------------------------------------------------------
//  Schema bootstrap — called once at startup
// ----------------------------------------------------------------
async function initSchema() {
  // Performance & safety pragmas
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA synchronous = NORMAL');

  // Tables
  await exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portfolio_media (
      id          TEXT    PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sub_label   TEXT    NOT NULL DEFAULT '',
      title       TEXT    NOT NULL DEFAULT '',
      media_url   TEXT    NOT NULL,
      thumb_url   TEXT    NOT NULL DEFAULT '',
      media_type  TEXT    NOT NULL DEFAULT 'image',
      view_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS homepage_panels (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      position   TEXT    NOT NULL UNIQUE,
      media_url  TEXT    NOT NULL,
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default categories (safe to run multiple times)
  const defaultCategories = [
    ['All',             'all'],
    ['People',          'people'],
    ['Beautiful Views', 'views'],
    ['Events',          'events'],
    ['Products',        'products'],
    ['Cars',            'cars'],
  ];
  for (const [name, slug] of defaultCategories) {
    await run(
      'INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)',
      [name, slug]
    );
  }

  // Seed default settings
  const defaultSettings = [
    ['whatsapp',     'https://wa.me/966500000000'],
    ['instagram',    'https://instagram.com/suhaibphoto'],
    ['hero_text_ar', '..جودة بصرية تليق بك'],
    ['hero_sub_ar',  'حكايات ترويها العدسة'],
  ];
  for (const [key, value] of defaultSettings) {
    await run(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  console.log('✅  Database initialised successfully');
}

module.exports = { db, run, all, get, exec, serialize, initSchema };
