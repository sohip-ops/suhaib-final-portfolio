/**
 * middleware/upload.js
 * Multer disk storage → Sharp image optimisation + watermark → Cloudinary upload.
 * Supports: JPEG, JPG, PNG, WebP, GIF, BMP (images) + MP4 (video).
 */
'use strict';

const multer     = require('multer');
const sharp      = require('sharp');
const cloudinary = require('cloudinary').v2;
const path       = require('path');
const fs         = require('fs');
const os         = require('os');

// ----------------------------------------------------------------
//  Cloudinary configuration (called once at startup)
// ----------------------------------------------------------------
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ----------------------------------------------------------------
//  Allowed MIME types
// ----------------------------------------------------------------
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif',  'image/bmp', 'video/mp4',
]);

// ----------------------------------------------------------------
//  Multer — store in OS temp directory
// ----------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.bin';
    const name = `suhaib_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard limit
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error(`Unsupported file type: ${file.mimetype}`), { status: 400 }));
    }
  },
});

// ----------------------------------------------------------------
//  Helper — safely delete a temp file (no-throw)
// ----------------------------------------------------------------
function cleanUp(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
}

// ----------------------------------------------------------------
//  processAndUpload
//  Images → resize → watermark → WebP → Cloudinary
//  Videos  → direct Cloudinary upload
// ----------------------------------------------------------------
async function processAndUpload(filePath, mimetype, folder = 'portfolio') {
  const isVideo = mimetype === 'video/mp4';
  let processedPath = null;

  try {
    if (isVideo) {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder,
        transformation: [{ quality: 'auto:good' }],
      });
      return {
        url:   result.secure_url,
        thumb: result.secure_url,
        type:  'video',
      };
    }

    // ---- Image pipeline ----
    const watermarkText = (process.env.WATERMARK_TEXT || 'Suhaib Photo').trim();
    processedPath = `${filePath}.webp`;

    // SVG watermark badge
    const svgText = `
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
      </svg>`;

    await sharp(filePath)
      .rotate()                          // auto-rotate from EXIF
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .composite([{
        input:   Buffer.from(svgText),
        gravity: 'southeast',
        blend:   'over',
      }])
      .webp({ quality: 82 })
      .toFile(processedPath);

    const result = await cloudinary.uploader.upload(processedPath, {
      folder,
      resource_type: 'image',
    });

    // Generate a crop-optimised thumbnail URL via Cloudinary transformations
    const thumbUrl = cloudinary.url(result.public_id, {
      width:        400,
      height:       500,
      crop:         'fill',
      gravity:      'auto',
      quality:      'auto',
      fetch_format: 'auto',
      secure:       true,
    });

    return { url: result.secure_url, thumb: thumbUrl, type: 'image' };

  } finally {
    // Always clean up temp files even on error
    cleanUp(filePath);
    cleanUp(processedPath);
  }
}

module.exports = { upload, processAndUpload, configureCloudinary };
