'use strict';
/**
 * middleware/upload.js
 *
 * Uses multer.memoryStorage() — NO temp files on disk.
 * Safe for ephemeral free-tier hosts (Render, Railway, Fly, etc.).
 *
 * processAndUpload(file) — streams the buffer straight to Cloudinary.
 * Images: auto-rotate → resize → SVG watermark → WebP → Cloudinary.
 * Videos: passed through directly with quality:auto:good.
 *
 * Returns: { mediaUrl, thumbUrl, mediaType }
 */

const multer      = require('multer');
const sharp       = require('sharp');
const cloudinary  = require('cloudinary').v2;
const streamifier = require('streamifier');

// ── Cloudinary setup ─────────────────────────────────────────────────────────
let _configured = false;

function configureCloudinary() {
  if (_configured) return;
  const { CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const missing = [
    !CLOUD_NAME            && 'CLOUD_NAME',
    !CLOUDINARY_API_KEY    && 'CLOUDINARY_API_KEY',
    !CLOUDINARY_API_SECRET && 'CLOUDINARY_API_SECRET',
  ].filter(Boolean);

  if (missing.length) {
    throw Object.assign(
      new Error(`Missing Cloudinary env vars: ${missing.join(', ')}`),
      { status: 500 }
    );
  }

  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true,
  });
  _configured = true;
}

// ── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif',  'image/bmp', 'video/mp4', 'video/quicktime',
]);

// ── Multer — memory storage (no disk I/O) ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },   // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(Object.assign(
      new Error(`Unsupported file type: ${file.mimetype}`),
      { status: 400 }
    ));
  },
});

// ── Upload a buffer stream to Cloudinary ─────────────────────────────────────
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ── Main processing function ──────────────────────────────────────────────────
/**
 * @param {Express.Multer.File} file  — req.file from multer
 * @param {string} folder             — Cloudinary folder name
 * @returns {{ mediaUrl, thumbUrl, mediaType }}
 */
async function processAndUpload(file, folder = 'portfolio') {
  configureCloudinary();

  const isVideo = file.mimetype.startsWith('video/');

  // ── Video: upload directly ───────────────────────────────────────────────
  if (isVideo) {
    const result = await uploadToCloudinary(file.buffer, {
      folder,
      resource_type: 'video',
      transformation: [{ quality: 'auto:good' }],
    });

    const thumbUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      format:        'jpg',
      width:  400,
      height: 500,
      crop:   'fill',
      gravity: 'auto',
      quality: 'auto',
      secure:  true,
    });

    return { mediaUrl: result.secure_url, thumbUrl, mediaType: 'video' };
  }

  // ── Image: resize + watermark + WebP → Cloudinary ───────────────────────
  const watermarkText = (process.env.WATERMARK_TEXT || 'Suhaib Photo').trim();

  const svgWatermark = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="56">
      <rect x="0" y="0" width="420" height="56" rx="6" fill="rgba(0,0,0,0.30)"/>
      <text x="210" y="38"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="22"
        font-weight="700"
        letter-spacing="3"
        fill="rgba(255,255,255,0.75)"
      >${watermarkText}</text>
    </svg>`);

  const processedBuffer = await sharp(file.buffer)
    .rotate()   // auto-rotate from EXIF
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .composite([{ input: svgWatermark, gravity: 'southeast', blend: 'over' }])
    .webp({ quality: 82 })
    .toBuffer();

  const result = await uploadToCloudinary(processedBuffer, {
    folder,
    resource_type: 'image',
  });

  const thumbUrl = cloudinary.url(result.public_id, {
    width:        400,
    height:       500,
    crop:         'fill',
    gravity:      'auto',
    quality:      'auto',
    fetch_format: 'auto',
    secure:       true,
  });

  return { mediaUrl: result.secure_url, thumbUrl, mediaType: 'image' };
}

module.exports = { upload, processAndUpload, configureCloudinary };
