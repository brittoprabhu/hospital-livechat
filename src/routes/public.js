import express from 'express';
import { ENV, loadDepartments } from '../config/index.js';

const router = express.Router();

router.get('/api/departments', async (_req, res) => {
  try {
    const departments = await loadDepartments();
    res.json({ departments });
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
