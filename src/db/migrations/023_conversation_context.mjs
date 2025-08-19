/** @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder */
/** @typedef {import('node-pg-migrate').ColumnDefinitions} ColumnDefinitions */

export const shorthands = /** @type {ColumnDefinitions} */ ({});

export async function up(pgm /** @type {MigrationBuilder} */) {
  // Optional metadata columns to carry bot context into human handoff
  pgm.addColumn('conversations', {
    topic: { type: 'varchar(120)', notNull: false },
    intent: { type: 'varchar(120)', notNull: false },
    context: { type: 'jsonb', notNull: false }, // e.g., { confidence, question, kbMatch, transcript }
  });
}

export async function down(pgm /** @type {MigrationBuilder} */) {
  pgm.dropColumn('conversations', 'context', { ifExists: true });
  pgm.dropColumn('conversations', 'intent', { ifExists: true });
  pgm.dropColumn('conversations', 'topic', { ifExists: true });
}
