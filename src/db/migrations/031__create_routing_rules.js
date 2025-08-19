/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.createTable("routing_rules", {
    id: "id",
    department: { type: "text" },
    contains_any: { type: "text[]", default: pgm.func("ARRAY[]::text[]") },
    then_reply: { type: "text" },
    then_action: { type: "text" }, // e.g., 'ESCALATE', 'SHOW_INSTRUCTIONS'
    active: { type: "boolean", default: true },
    priority: { type: "int", default: 100 },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("routing_rules", "contains_any", {
    using: "GIN",
  });
};

export const down = (pgm) => {
  pgm.dropTable("routing_rules");
};
