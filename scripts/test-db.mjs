// scripts/test-db.mjs
import { pool } from '../src/db/pool.js';

const { rows } = await pool.query('SELECT 1 as ok');
console.log(rows);
await pool.end();
