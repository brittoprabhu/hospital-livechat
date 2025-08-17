import pkg from 'pg';
const { Pool } = pkg;

let pool;

export function createPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || undefined;
  pool = new Pool(
    connectionString
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'hospital_livechat',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        }
  );
  return pool;
}
