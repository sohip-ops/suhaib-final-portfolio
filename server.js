/**
 * server.js — Suhaib Photo · Main Entry Point
 *
 * Stack: Node.js + Express + SQLite (sqlite3 async) + Cloudinary
 * Security: Helmet · CORS · Rate-Limit · JWT · express-validator (XSS)
 */
'use strict';

require('dotenv').config();

// ----------------------------------------------------------------
//  Validate required environment variables at startup
// ----------------------------------------------------------------
const REQUIRED_ENV = ['ADMIN_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing environment variables: ${missing.join(', ')}`);
  console.error('    Copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const { configureCloudinary } = require('./middleware/upload');
const { initSchema }          = require('./db/database');

// Initialise Cloudinary
configureCloudinary();

// ----------------------------------------------------------------
//  Route imports
// ----------------------------------------------------------------
const authRoutes      = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const categoryRoutes  = require('./routes/categories');
const panelRoutes     = require('./routes/panels');
const settingsRoutes  = require('./routes/settings');

const app = express();

// ----------------------------------------------------------------
//  Security headers (Helmet)
// ----------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ----------------------------------------------------------------
//  CORS
// ----------------------------------------------------------------
const ALLOWED_ORIGINS = [
  `http://localhost:${process.env.PORT || 3000}`,
  `https://localhost:${process.env.PORT || 3000}`,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  // Add your production domain here:
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // In production, allow same-origin requests (origin is undefined)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any origin in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  credentials: true,
}));

// ----------------------------------------------------------------
//  Body parsers
// ----------------------------------------------------------------
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(cookieParser());

// ----------------------------------------------------------------
//  Rate limiters
// ----------------------------------------------------------------
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

// ----------------------------------------------------------------
//  Block direct access to admin.html
// ----------------------------------------------------------------
app.get(['/admin.html', '/public/admin.html'], (_req, res) => {
  return res.status(404).send('Not found');
});

// ----------------------------------------------------------------
//  Serve frontend static files
// ----------------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));
app.get('/portfolio', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'portfolio.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});
// ----------------------------------------------------------------
//  API routes
// ----------------------------------------------------------------
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/portfolio',  portfolioRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/panels',     panelRoutes);
app.use('/api/settings',   settingsRoutes);

// ----------------------------------------------------------------
//  Admin dashboard — server-side JWT guard
// ----------------------------------------------------------------
app.get('/admin', (req, res) => {
  let token = req.cookies && req.cookies.admin_token;
  if (!token) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }

  if (!token) {
    return res.status(401).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>غير مصرح | Suhaib Photo</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#fff;font-family:'Inter',sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    .wrap{max-width:360px;padding:40px}
    .icon{font-size:56px;margin-bottom:24px;opacity:.6}
    h1{font-size:20px;font-weight:600;margin-bottom:12px;color:#ef4444}
    p{color:#666;font-size:14px;margin-bottom:32px;line-height:1.6}
    a{display:inline-block;padding:12px 32px;background:rgba(201,169,110,0.15);
      border:1px solid rgba(201,169,110,0.4);color:#c9a96e;border-radius:10px;
      text-decoration:none;font-size:14px;transition:.3s}
    a:hover{background:rgba(201,169,110,0.25)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">🔒</div>
    <h1>غير مصرح بالدخول</h1>
    <p>يجب تسجيل الدخول أولاً للوصول إلى لوحة التحكم.</p>
    <a href="/">العودة للرئيسية</a>
  </div>
</body>
</html>`);
  }

  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET);
    return res.sendFile(path.join(__dirname, 'public/admin.html'));
  } catch (err) {
    res.clearCookie('admin_token');
    return res.status(401).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>انتهت الجلسة | Suhaib Photo</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#fff;font-family:'Inter',sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    .wrap{max-width:360px;padding:40px}
    .icon{font-size:56px;margin-bottom:24px;opacity:.6}
    h1{font-size:20px;font-weight:600;margin-bottom:12px;color:#f59e0b}
    p{color:#666;font-size:14px;margin-bottom:32px;line-height:1.6}
    a{display:inline-block;padding:12px 32px;background:rgba(201,169,110,0.15);
      border:1px solid rgba(201,169,110,0.4);color:#c9a96e;border-radius:10px;
      text-decoration:none;font-size:14px;transition:.3s}
    a:hover{background:rgba(201,169,110,0.25)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">⏰</div>
    <h1>انتهت صلاحية الجلسة</h1>
    <p>انتهت مدة الجلسة. يرجى تسجيل الدخول مجدداً من الصفحة الرئيسية.</p>
    <a href="/">تسجيل الدخول</a>
  </div>
</body>
</html>`);
  }
});

// ----------------------------------------------------------------
//  SPA fallback — serve portfolio.html for /portfolio route too
// ----------------------------------------------------------------
app.get('/portfolio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------------------
//  Global error handler
// ----------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  if (status >= 500) console.error('[Server Error]', err);
  res.status(status).json({ success: false, message });
});

// ----------------------------------------------------------------
//  Bootstrap: init DB schema, then start HTTP server
// ----------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║      Suhaib Photo — Server Started      ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  Frontend : http://localhost:${PORT}         ║`);
      console.log(`║  Admin    : http://localhost:${PORT}/admin   ║`);
      console.log(`║  Password : ${process.env.ADMIN_PASSWORD}            ║`);
      console.log('╚══════════════════════════════════════════╝\n');
    });
  })
  .catch((err) => {
    console.error('❌  Failed to initialise database:', err);
    process.exit(1);
  });
