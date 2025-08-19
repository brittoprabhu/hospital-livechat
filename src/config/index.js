import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db/pool.js'; // or correct path based on your project
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

export const ENV = {
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
  PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,

  // Quick contacts
  APPOINTMENT_NUMBER: process.env.APPOINTMENT_NUMBER || '+91-90000-00001',
  AMBULANCE_NUMBER: process.env.AMBULANCE_NUMBER || '+91-90000-00002',
  LAB_NUMBER: process.env.LAB_NUMBER || '+91-90000-00003',

  // SMTP / Gmail
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASS: process.env.GMAIL_PASS,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,

  // Twilio (optional)
  TWILIO_ENABLED: process.env.TWILIO_ENABLED === 'true',
  TWILIO_SID: process.env.TWILIO_SID,
  TWILIO_TOKEN: process.env.TWILIO_TOKEN,
  TWILIO_FROM: process.env.TWILIO_FROM,
  ADMIN_SMS_TO: process.env.ADMIN_SMS_TO,

  // Admin IP allowlist (comma-separated)
  ADMIN_ALLOWLIST: (process.env.ADMIN_ALLOWLIST || '')
    .split(',').map(s => s.trim()).filter(Boolean),
};



export async function loadDepartments() {
  const pool = getPool();
  try {
    const result = await pool.query('SELECT name FROM departments');
    return result.rows.map(row => row.name);
  } catch (err) {
    console.error('Failed to load departments from DB:', err);
    return ['General']; // fallback
  }
}
