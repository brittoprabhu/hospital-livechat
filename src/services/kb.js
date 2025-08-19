// src/services/kb.js
import { getPool } from '../db/pool.js';
const pool = getPool();
/**
 * Search FAQ entries in the database by keyword(s).
 * Uses PostgreSQL full text search with GIN index if available.
 */
export async function searchFaq(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  const client = await pool.connect();
  try {
    const sql = `
      SELECT id, question, answer, keywords, ts_rank_cd(to_tsvector('english', question || ' ' || coalesce(keywords, '')), plainto_tsquery($1)) AS rank
      FROM faq_entries
      WHERE to_tsvector('english', question || ' ' || coalesce(keywords, '')) @@ plainto_tsquery($1)
      ORDER BY rank DESC
      LIMIT 5;
    `;
    const { rows } = await client.query(sql, [query]);
    return rows;
  } finally {
    client.release();
  }
}
