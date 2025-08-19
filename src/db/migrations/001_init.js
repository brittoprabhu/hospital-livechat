/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.createTable("agents", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(190)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    department: { type: "varchar(100)", notNull: true },
    status: { type: "varchar(20)", default: "offline" },
    last_seen: { type: "timestamp" },
    is_verified: { type: "boolean", default: false },
    is_approved: { type: "boolean", default: false },
    last_login_at: { type: "timestamp" },
    last_login_ip: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("admin_users", {
    id: "id",
    username: { type: "varchar(100)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    email: { type: "varchar(190)" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("conversations", {
    id: { type: "varchar(64)", primaryKey: true },
    department: { type: "varchar(100)", notNull: true },
    patient_name: { type: "varchar(100)" },
    assigned_agent_id: { type: "integer", references: "agents", onDelete: "cascade" },
    status: { type: "varchar(32)", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp" },
  });

  pgm.createIndex("conversations", "department");
  pgm.createIndex("conversations", "status");

  pgm.createTable("messages", {
    id: "id",
    chat_id: { type: "varchar(64)", notNull: true, references: "conversations", onDelete: "cascade" },
    sender: { type: "varchar(10)", notNull: true },
    text: { type: "text" },
    file_url: { type: "varchar(255)" },
    file_name: { type: "varchar(255)" },
    agent_name: { type: "varchar(100)" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("messages", "chat_id");
  pgm.createIndex("messages", "created_at");

  pgm.createTable("agent_invitations", {
    id: "id",
    email: { type: "varchar(190)", notNull: true },
    department: { type: "varchar(100)", notNull: true },
    token: { type: "varchar(128)", notNull: true, unique: true },
    expires_at: { type: "timestamp", notNull: true },
    accepted_at: { type: "timestamp" },
    created_by_admin_id: { type: "integer", references: "admin_users" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("email_verification_tokens", {
    id: "id",
    agent_id: { type: "integer", notNull: true, references: "agents", onDelete: "cascade" },
    token: { type: "varchar(128)", notNull: true, unique: true },
    expires_at: { type: "timestamp", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  // Trigger for updated_at
  pgm.createFunction(
    "set_updated_at",
    [],
    { returns: "trigger", language: "plpgsql" },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );
  pgm.createTrigger("conversations", "trg_conversations_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
};

export const down = (pgm) => {
  pgm.dropTrigger("conversations", "trg_conversations_set_updated_at");
  pgm.dropFunction("set_updated_at");
  pgm.dropTable("email_verification_tokens");
  pgm.dropTable("agent_invitations");
  pgm.dropTable("messages");
  pgm.dropTable("conversations");
  pgm.dropTable("admin_users");
  pgm.dropTable("agents");
};
