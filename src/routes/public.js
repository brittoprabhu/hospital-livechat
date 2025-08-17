import express from 'express';
import { ENV, loadDepartments } from '../config/index.js';

const router = express.Router();

router.get('/api/departments', (_req, res) => {
  res.json({ departments: loadDepartments() });
});

router.get('/api/quick-contacts', (_req, res) => {
  res.json({
    appointmentNumber: ENV.APPOINTMENT_NUMBER,
    ambulanceNumber: ENV.AMBULANCE_NUMBER,
    labNumber: ENV.LAB_NUMBER,
  });
});

export default router;
