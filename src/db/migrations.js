export async function runMigrations(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'offline',
        last_seen TIMESTAMP NULL,
        is_verified BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP NULL,
        last_login_ip TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(190),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        department VARCHAR(100) NOT NULL,
        patient_name VARCHAR(100),
        assigned_agent_id INTEGER REFERENCES agents(id),
        status VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_department ON conversations(department)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        chat_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL,
        text TEXT NULL,
        file_url VARCHAR(255) NULL,
        file_name VARCHAR(255) NULL,
        agent_name VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);

    await pool.query(`
      CREATE OR REPLACE FUNCTION public.set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;`);
    await pool.query(`DROP TRIGGER IF EXISTS trg_conversations_set_updated_at ON conversations`);
    await pool.query(`
      CREATE TRIGGER trg_conversations_set_updated_at
      BEFORE UPDATE ON conversations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_invitations (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(190) NOT NULL,
        department VARCHAR(100) NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP NULL,
        created_by_admin_id INTEGER REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id BIGSERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    // idempotent adds
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS patient_name VARCHAR(100)`);
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent_id INTEGER`);
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_login_ip TEXT NULL`);
  } catch (e) {
    console.error('[migrations] error', e);
    throw e;
  }
}
