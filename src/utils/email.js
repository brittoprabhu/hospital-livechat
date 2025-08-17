import nodemailer from 'nodemailer';
import { ENV } from '../config/index.js';

export async function sendEmail(to, subject, text) {
  try {
    if (ENV.GMAIL_USER && ENV.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: ENV.GMAIL_USER, pass: ENV.GMAIL_PASS },
      });
      await transporter.sendMail({ from: ENV.SMTP_FROM || ENV.GMAIL_USER, to, subject, text });
      return;
    }
    if (ENV.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST,
        port: Number(ENV.SMTP_PORT || 587),
        secure: !!ENV.SMTP_SECURE,
        auth: (ENV.SMTP_USER && ENV.SMTP_PASS) ? { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS } : undefined,
      });
      await transporter.sendMail({ from: ENV.SMTP_FROM || ENV.SMTP_USER, to, subject, text });
      return;
    }
    console.log('Email not sent — no SMTP configured.');
  } catch (err) {
    console.error('Email error', err);
  }
}
