// db/faq.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/hospital',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Load all active FAQ entries from the database.
 * Includes: id, question, answer, keywords, tags
 */
export async function loadFaqs() {
  const query = `
    SELECT id, question, answer, keywords, tags, parent_id
    FROM faq_entries
    WHERE active = true
  `;
  const result = await pool.query(query);
  return result.rows;
}
