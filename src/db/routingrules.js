import { getPool } from './pool.js';

export async function loadRoutingRules() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT *
    FROM routing_rules
    WHERE active = TRUE
    ORDER BY priority ASC
  `);
  return result.rows;
}
