// scripts/seedAssignFaqDepartments.js
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
});

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const rules = [
  { department: 'Appointment', terms: ['appointment', 'schedule', 'booking', 'doctor', 'consult'] },
  { department: 'Ambulance', terms: ['ambulance', 'emergency', 'transport'] },
  { department: 'Lab', terms: ['test', 'lab', 'blood', 'report', 'scan'] },
  { department: 'Billing', terms: ['bill', 'payment', 'invoice', 'charge'] },
  { department: 'Pharmacy', terms: ['medicine', 'drug', 'pharmacy', 'prescription'] },
];

async function assignDepartments() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT id, question FROM faq_entries`);
    const updates = [];

    for (const { id, question } of rows) {
      const lower = question.toLowerCase();
      const match = rules.find(rule =>
        rule.terms.some(term => lower.includes(term))
      );
      const dept = match ? match.department : null;

      updates.push(client.query(
        `UPDATE faq_entries SET department = $1 WHERE id = $2`,
        [dept, id]
      ));
    }

    await Promise.all(updates);
    console.log(`✅ Updated ${updates.length} entries with department classification.`);
  } catch (err) {
    console.error('❌ Error updating FAQ departments:', err);
  } finally {
    client.release();
    pool.end();
  }
}

assignDepartments();
