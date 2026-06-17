'use strict';
/**
 * server.js — Suhaib Photo · Main Entry Point (Vercel-ready)
 *
 * Stack   : Node.js + Express + MongoDB Atlas (Mongoose) + Cloudinary
 * Security: Helmet · CORS · Rate-Limit · JWT · express-validator (XSS)
 *
 * Frontend: served from ./public (index.html, portfolio.html, admin panel, assets)
 *
 * Vercel notes:
 *  - No top-level process.exit()/blocking DB connect at module load — a serverless
 *    module must finish loading synchronously so it can be exported as a handler.
 *  - MongoDB connection is opened lazily on the first /api request per warm
 *    container and reused (mongoose.connection.readyState check) on subsequent
 *    invocations, instead of reconnecting every request.
 *  - Wrapped with serverless-http so the same file works as a Vercel Function
 *    AND as a normal long-running server locally (`node server.js`).
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const mongoose     = require('mongoose');
const serverless   = require('serverless-http');

const { configureCloudinary } = require('./middleware/upload');

// ── Route imports ────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const categoryRoutes  = require('./routes/categories');
const panelRoutes     = require('./routes/panels');
const settingsRoutes  = require('./routes/settings');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  `http://localhost:${process.env.PORT || 3000}`,
  `https://localhost:${process.env.PORT || 3000}`,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(cookieParser());

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — try again in 15 minutes' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

app.use('/api/', apiLimiter);

// ── Lazy DB/Cloudinary bootstrap — runs once per warm container, only for /api ─
let seeded = false;

async function seedDefaults() {
  const { Category, Settings } = require('./models');

  const defaults = [
    { name: 'All',             nameAr: 'الكل',          nameEn: 'All',            slug: 'all',      isDefault: true },
    { name: 'People',          nameAr: 'أشخاص',          nameEn: 'People',         slug: 'people',   isDefault: true },
    { name: 'Beautiful Views', nameAr: 'مناظر جميلة',   nameEn: 'Beautiful Views', slug: 'views',    isDefault: true },
    { name: 'Events',          nameAr: 'فعاليات',        nameEn: 'Events',         slug: 'events',   isDefault: true },
    { name: 'Products',        nameAr: 'منتجات',         nameEn: 'Products',       slug: 'products', isDefault: true },
    { name: 'Cars',            nameAr: 'سيارات',         nameEn: 'Cars',           slug: 'cars',     isDefault: true },
  ];
  for (const cat of defaults) {
    await Category.findOneAndUpdate({ slug: cat.slug }, { $set: cat }, { upsert: true });
  }

  await Settings.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true }
  );

  console.log('✅  Default data seeded');
}

async function ensureReady(_req, res, next) {
  try {
    const REQUIRED_ENV = ['ADMIN_PASSWORD', 'JWT_SECRET', 'MONGODB_URI'];
    const missing = REQUIRED_ENV.filter(k => !process.env[k]);
    if (missing.length) {
      return res.status(500).json({
        success: false,
        message: `Missing environment variables: ${missing.join(', ')}`,
      });
    }

    configureCloudinary();

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('✅  Connected to MongoDB Atlas →', mongoose.connection.host);
    }

    if (!seeded) {
      await seedDefaults();
      seeded = true;
    }

    next();
  } catch (err) {
    console.error('[DB bootstrap error]', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
}

// Only the API needs the DB — static pages keep working even if Mongo is briefly down
app.use('/api', ensureReady);

// ── Block direct access to admin.html ────────────────────────────────────────
app.get(['/admin.html', '/public/admin.html'], (_req, res) => {
  return res.status(404).send('Not found');
});

// ── Serve frontend static files from ./public ─────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/portfolio',  portfolioRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/panels',     panelRoutes);
app.use('/api/settings',   settingsRoutes);

// ── Admin dashboard — server-side JWT guard ───────────────────────────────────
function unauthorisedPage(title, icon, color, heading, body, link) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}
  body{background:#0a0a0a;color:#fff;font-family:Inter,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
  .w{max-width:360px;padding:40px}.icon{font-size:56px;margin-bottom:24px;opacity:.6}
  h1{font-size:20px;font-weight:600;margin-bottom:12px;color:${color}}
  p{color:#666;font-size:14px;margin-bottom:32px;line-height:1.6}
  a{display:inline-block;padding:12px 32px;background:rgba(201,169,110,.15);
    border:1px solid rgba(201,169,110,.4);color:#c9a96e;border-radius:10px;
    text-decoration:none;font-size:14px;transition:.3s}
  a:hover{background:rgba(201,169,110,.25)}</style>
</head><body><div class="w">
  <div class="icon">${icon}</div>
  <h1>${heading}</h1><p>${body}</p>
  <a href="/">${link}</a>
</div></body></html>`;
}

app.get('/admin', (req, res) => {
  let token = req.cookies && req.cookies.admin_token;
  if (!token) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }

  if (!token) {
    return res.status(401).send(unauthorisedPage(
      'غير مصرح | Suhaib Photo', '🔒', '#ef4444',
      'غير مصرح بالدخول',
      'يجب تسجيل الدخول أولاً للوصول إلى لوحة التحكم.',
      'العودة للرئيسية'
    ));
  }

  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET);
    return res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
  } catch {
    res.clearCookie('admin_token');
    return res.status(401).send(unauthorisedPage(
      'انتهت الجلسة | Suhaib Photo', '⏰', '#f59e0b',
      'انتهت صلاحية الجلسة',
      'انتهت مدة الجلسة. يرجى تسجيل الدخول مجدداً من الصفحة الرئيسية.',
      'تسجيل الدخول'
    ));
  }
});

// ── Page routes ───────────────────────────────────────────────────────────────
app.get('/portfolio', (_req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'portfolio.html'))
);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  if (status >= 500) console.error('[Server Error]', err);
  res.status(status).json({ success: false, message });
});

// ── Export ───────────────────────────────────────────────────────────────────
// On Vercel: export a serverless-http handler (no app.listen — Vercel owns the port).
// Locally / on traditional hosts (Render, Railway, Fly, VPS): run a normal server.
if (process.env.VERCEL) {
  module.exports = serverless(app);
} else {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║      Suhaib Photo — Server Started       ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Frontend : http://localhost:${PORT}          ║`);
    console.log(`║  Portfolio: http://localhost:${PORT}/portfolio║`);
    console.log(`║  Admin    : http://localhost:${PORT}/admin    ║`);
    console.log('╚══════════════════════════════════════════╝\n');
  });
  module.exports = app;
}
