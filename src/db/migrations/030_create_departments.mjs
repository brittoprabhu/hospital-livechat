// src/db/migrations/030_create_departments.mjs

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  // Create table
  pgm.createTable('departments', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Insert seed values
  const departments = [
    'Eye',
    'Cardiology',
    'Pediatrics',
    'Orthopedics',
    'ENT',
    'General',
    'Billing',
  ];

  for (const name of departments) {
    pgm.sql(`INSERT INTO departments (name) VALUES ('${name}')`);
  }
};

export const down = (pgm) => {
  pgm.dropTable('departments');
};
