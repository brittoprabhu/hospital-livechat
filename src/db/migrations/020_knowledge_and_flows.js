/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.createTable("faq_entries", {
    id: "id",
    question: { type: "text", notNull: true },
    answer: { type: "text", notNull: true },
    tags: { type: "text[]" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("decision_flows", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    description: { type: "text" },
    structure: { type: "jsonb", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("rules", {
    id: "id",
    condition: { type: "jsonb", notNull: true },
    action: { type: "jsonb", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("forms", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    schema: { type: "jsonb", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });
};

export const down = (pgm) => {
  pgm.dropTable("forms");
  pgm.dropTable("rules");
  pgm.dropTable("decision_flows");
  pgm.dropTable("faq_entries");
};
