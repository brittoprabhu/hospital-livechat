export async function up(pgm) {
  pgm.addColumn('departments', {
    order: { type: 'integer', notNull: false },
  });
}

export async function down(pgm) {
  pgm.dropColumn('departments', 'order');
}
