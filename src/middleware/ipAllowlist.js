import { ENV } from '../config/index.js';

export function isIpAllowed(req) {
  if (!ENV.ADMIN_ALLOWLIST.length) return true;
  const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '')
    .split(',')[0].trim();
  return ENV.ADMIN_ALLOWLIST.includes(ip);
}

export function requireAllowedIp(req, res, next) {
  if (!isIpAllowed(req)) return res.status(403).json({ error: 'IP not allowed' });
  next();
}
