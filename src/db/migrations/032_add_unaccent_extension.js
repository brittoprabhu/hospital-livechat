// migrations/XXXX_add_unaccent_extension.js
/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP EXTENSION IF EXISTS unaccent;`);
};
