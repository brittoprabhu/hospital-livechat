/** @type {import('node-pg-migrate').Migration} */
export async function up(pgm) {
  await pgm.addColumn('faq_entries', {
    parent_id: {
      type: 'integer',
      references: '"faq_entries"',
      onDelete: 'SET NULL',
    }
  });
}

/** @type {import('node-pg-migrate').Migration} */
export async function down(pgm) {
  await pgm.dropColumn('faq_entries', 'parent_id');
}
