import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, adminOnly, signToken } from '../middleware/auth.js';
import { adminRateLimiter } from '../middleware/rateLimiters.js';
import { requireAllowedIp } from '../middleware/ipAllowlist.js';
import { loadDepartments, ENV } from '../config/index.js';
import { newTokenHex } from '../utils/tokens.js';
import { sendEmail } from '../utils/email.js';

export default function AdminRoutes(pool) {
  const router = express.Router();

  router.post('/api/admin/register', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'username & password required' });
      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO admin_users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id`,
        [username, hash, email || null]
      );
      res.json({ ok: true, id: result.rows[0].id });
    } catch (e) {
      if (e?.code === '23505') return res.status(409).json({ error: 'Username already exists' });
      console.error(e); res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const rows = await pool.query('SELECT * FROM admin_users WHERE username=$1 LIMIT 1', [username]);
      if (!rows.rowCount) return res.status(401).json({ error: 'Invalid credentials' });
      const admin = rows.rows[0];
      const ok = await bcrypt.compare(password, admin.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = signToken({ id: admin.id, role: 'admin' });
      res.json({ token });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
  });

  router.get('/api/admin/overview',
    authenticateToken, adminOnly, adminRateLimiter, requireAllowedIp,
    async (_req, res) => {
      try {
        const agents = await pool.query(
          'SELECT id, name, email, department, status, last_seen, is_verified, is_approved FROM agents ORDER BY id ASC'
        );
        const chats = await pool.query(`
          SELECT id, department, patient_name AS "patientName",
                 assigned_agent_id AS "assignedAgentId", status, created_at
            FROM conversations
           ORDER BY created_at DESC
           LIMIT 200`);
           const departments = await loadDepartments();
res.json({ agents: agents.rows, chats: chats.rows, departments });
        
      } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
    }
  );

  router.post('/api/admin/agents/approve',
    authenticateToken, adminOnly, adminRateLimiter, requireAllowedIp,
    async (req, res) => {
      try {
        const { agentId, approve } = req.body;
        if (!agentId) return res.status(400).json({ error: 'agentId required' });
        await pool.query('UPDATE agents SET is_approved=$1 WHERE id=$2', [approve === true, agentId]);
        res.json({ ok: true });
      } catch (e) { console.error(e); res.status(500).json({ error: 'Approve failed' }); }
    }
  );
router.post('/api/admin/invitations',
  authenticateToken, adminOnly, adminRateLimiter, requireAllowedIp,
  async (req, res) => {
    try {
      const { email, department, expiresInHours = 72 } = req.body;

      const departments = await loadDepartments(); // FIX: Await async function
      if (!email || !department || !departments.includes(department)) {
        return res.status(400).json({ error: 'Email and valid department required' });
      }

      const token = newTokenHex(24);
      const expiresAt = new Date(Date.now() + Number(expiresInHours) * 3600 * 1000);
      const result = await pool.query(
        `INSERT INTO agent_invitations (email, department, token, expires_at, created_by_admin_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, token, expires_at`,
        [email.toLowerCase(), department, token, expiresAt, req.user.id]
      );

      const acceptUrl = `${ENV.PUBLIC_URL}/agent-accept.html?token=${token}`;
      await sendEmail(email, 'Your Agent Invitation',
        `You have been invited as an agent for ${department}.\n\nAccept: ${acceptUrl}\n\nExpires ${expiresAt.toISOString()}.`
      );

      res.json({ ok: true, token: result.rows[0].token, expiresAt: result.rows[0].expires_at });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create invitation' });
    }
});


  router.get('/api/admin/chats/export',
    authenticateToken, adminOnly, adminRateLimiter, requireAllowedIp,
    async (req, res) => {
      try {
        const from = req.query.from ? new Date(req.query.from) : new Date(0);
        const to   = req.query.to   ? new Date(req.query.to)   : new Date();

        const rows = await pool.query(`
          SELECT m.chat_id AS "chatId", c.department, c.patient_name AS "patientName",
                 m.sender, m.text, m.file_url AS "fileUrl", m.file_name AS "fileName",
                 m.agent_name AS "agentName", m.created_at AS "createdAt"
            FROM messages m
            LEFT JOIN conversations c ON c.id = m.chat_id
           WHERE m.created_at BETWEEN $1 AND $2
           ORDER BY m.created_at ASC`,
          [from, to]
        );

        const headers = ['chatId','department','patientName','sender','agentName','text','fileName','fileUrl','createdAt'];
        const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="chat_transcripts.csv"');
        res.write(headers.join(',') + '\n');
        for (const r of rows.rows) {
          const line = [
            r.chatId, r.department, r.patientName, r.sender, r.agentName,
            r.text, r.fileName, r.fileUrl, (r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt)
          ].map(escape).join(',');
          res.write(line + '\n');
        }
        res.end();
      } catch (e) { console.error('Export error', e); res.status(500).json({ error: 'Export failed' }); }
    }
  );

  router.post('/api/admin/close_chat',
    authenticateToken, adminOnly, adminRateLimiter, requireAllowedIp,
    async (req, res) => {
      try {
        const { chatId } = req.body;
        await pool.query(`UPDATE conversations SET status='closed', updated_at=NOW() WHERE id=$1`, [chatId]);
        res.json({ ok: true });
      } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
    }
  );

  return router;
}
