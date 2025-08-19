// services/routingService.js
import { getPool } from '../db/pool.js';

export async function findRoutingRule(message, department = null) {
  const pool = getPool();
  const lowerMsg = message.toLowerCase();

  const query = `
    SELECT *
    FROM routing_rules
    WHERE active = TRUE
      AND ($1::text IS NULL OR department = $1)
    ORDER BY priority ASC, created_at DESC
  `;

  try {
    const result = await pool.query(query, [department]);
    for (const rule of result.rows) {
      const triggers = rule.contains_any || [];
      for (const trigger of triggers) {
        if (lowerMsg.includes(trigger.toLowerCase())) {
          return rule;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to evaluate routing rules:', error);
    return null;
  }
}
