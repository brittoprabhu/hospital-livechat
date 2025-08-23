import express from 'express';
import { ENV } from '../config/index.js';
import { getPool } from '../db/pool.js';

const router = express.Router();

router.get('/api/departments', async (_req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT d.name,
             d.order,
             COUNT(a.*) FILTER (WHERE a.status = 'online') AS online
        FROM departments d
        LEFT JOIN agents a ON a.department = d.name
       GROUP BY d.id
       ORDER BY d.order NULLS LAST, d.id
    `);
    res.json({ departments: rows });
  } catch (e) {
    console.error('[ERROR] Failed to load departments:', e);
    res.status(500).json({ error: 'Failed to load departments' });
  }
});


router.get('/api/quick-contacts', (_req, res) => {
  res.json({
    appointmentNumber: ENV.APPOINTMENT_NUMBER,
    ambulanceNumber: ENV.AMBULANCE_NUMBER,
    labNumber: ENV.LAB_NUMBER,
  });
});

export default router;
