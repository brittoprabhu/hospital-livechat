import express from 'express';
import bcrypt from 'bcryptjs';
import { authLimiter } from '../middleware/rateLimiters.js';
import { signToken } from '../middleware/auth.js';
import { loadDepartments } from '../config/index.js';
import { newTokenHex } from '../utils/tokens.js';
import { sendEmail } from '../utils/email.js';
import { ENV } from '../config/index.js';

export default function AgentRoutes(pool) {
  const router = express.Router();

  router.post('/api/agents/register', async (req, res) => {
    try {
      const { name, email, password, department } = req.body;
      if (!name || !email || !password || !department) return res.status(400).json({ error: 'All fields are required' });
      if (!loadDepartments().includes(department)) return res.status(400).json({ error: 'Invalid department' });

      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO agents (name, email, password_hash, department)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, email.toLowerCase(), hash, department]
      );
      const id = result.rows[0].id;
      const token = signToken({ id, role: 'agent', department });
      res.json({ token, id, name, department, email: email.toLowerCase() });
    } catch (e) {
      if (e?.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      console.error(e); res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/api/agents/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await pool.query(`SELECT * FROM agents WHERE email=$1 LIMIT 1`, [String(email || '').toLowerCase()]);
      if (!result.rowCount) return res.status(401).json({ error: 'Invalid credentials' });

      const a = result.rows[0];
      const ok = await bcrypt.compare(password, a.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      if (!a.is_verified) return res.status(403).json({ error: 'Email not verified' });
      if (!a.is_approved) return res.status(403).json({ error: 'Awaiting admin approval' });

      const token = signToken({ id: a.id, role: 'agent', department: a.department });
      await pool.query('UPDATE agents SET last_login_at=NOW(), last_login_ip=$1 WHERE id=$2',
        [req.headers['x-forwarded-for'] || req.socket.remoteAddress, a.id]);

      res.json({ token, id: a.id, name: a.name, department: a.department, email: a.email });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
  });

// Example Express route
router.get('/api/faqs/top', async (req, res) => {
  const faqs = await pool.query('SELECT id, question FROM faq_entries WHERE parent_id IS NULL ORDER BY id');
  res.json(faqs.rows);
});


  // Accept invite -> create agent -> send email verification
  router.post('/api/agents/accept-invite', authLimiter, async (req, res) => {
    try {
      const { token, name, password } = req.body;
      if (!token || !name || !password) return res.status(400).json({ error: 'token, name, password required' });

      const inv = await pool.query(
        `SELECT id, email, department, expires_at, accepted_at FROM agent_invitations WHERE token=$1 LIMIT 1`, [token]
      );
      if (!inv.rowCount) return res.status(400).json({ error: 'Invalid invitation' });
      const invite = inv.rows[0];
      if (invite.accepted_at) return res.status(400).json({ error: 'Invitation already used' });
      if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: 'Invitation expired' });

      const email = invite.email.toLowerCase();
      const exists = await pool.query('SELECT id FROM agents WHERE email=$1 LIMIT 1', [email]);
      if (exists.rowCount) return res.status(409).json({ error: 'Email already registered' });

      const hash = await bcrypt.hash(password, 10);
      const agentRes = await pool.query(
        `INSERT INTO agents (name, email, password_hash, department, is_verified, is_approved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, email`,
        [name, email, hash, invite.department, false, false]
      );

      await pool.query(`UPDATE agent_invitations SET accepted_at=NOW() WHERE id=$1`, [invite.id]);

      const verifyToken = newTokenHex(24);
      const verifyExpires = new Date(Date.now() + 24 * 3600 * 1000);
      await pool.query(
        `INSERT INTO email_verification_tokens (agent_id, token, expires_at) VALUES ($1, $2, $3)`,
        [agentRes.rows[0].id, verifyToken, verifyExpires]
      );

      const verifyUrl = `${ENV.PUBLIC_URL}/agent-verify.html?token=${verifyToken}`;
      await sendEmail(agentRes.rows[0].email, 'Verify your email',
        `Please verify your email:\n\n${verifyUrl}\n\nExpires ${verifyExpires.toISOString()}`);

      res.json({ ok: true, message: 'Account created. Check your email to verify.' });
    } catch (e) {
      if (e?.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      console.error(e); res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  router.post('/api/agents/verify-email', authLimiter, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'token required' });

      const row = await pool.query(
        `SELECT evt.id, evt.agent_id, evt.expires_at, a.is_verified
           FROM email_verification_tokens evt
           JOIN agents a ON a.id = evt.agent_id
          WHERE evt.token=$1 LIMIT 1`, [token]
      );
      if (!row.rowCount) return res.status(400).json({ error: 'Invalid token' });
      const rec = row.rows[0];
      if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });
      if (rec.is_verified) return res.json({ ok: true, message: 'Already verified' });

      await pool.query('UPDATE agents SET is_verified=true WHERE id=$1', [rec.agent_id]);
      await pool.query('DELETE FROM email_verification_tokens WHERE id=$1', [rec.id]);

      res.json({ ok: true, message: 'Email verified. Await admin approval.' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Verify failed' }); }
  });

  return router;
}
