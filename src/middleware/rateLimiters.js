import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .split(',')[0].trim();
    const email = req.body?.email ? String(req.body.email).toLowerCase() : '';
    return `${ip}|${email}`;
  },
  handler: (req, res) => {
    const resetSec = Math.ceil((req.rateLimit.resetTime?.getTime() - Date.now()) / 1000) || undefined;
    if (resetSec) res.set('Retry-After', String(resetSec));
    res.status(429).json({ error: 'Too many login attempts. Please try again later.', retryAfterSeconds: resetSec });
  },
});

export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
