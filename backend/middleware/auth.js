'use strict';
/**
 * middleware/auth.js
 * Verifies JWT from HttpOnly cookie OR Authorization: Bearer header.
 */

const jwt = require('jsonwebtoken');

module.exports = function requireAdmin(req, res, next) {
  let token = req.cookies && req.cookies.admin_token;

  if (!token) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: no token provided' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired, please log in again'
      : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }
};
