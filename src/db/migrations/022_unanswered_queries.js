export const up = (pgm) => {
  pgm.createTable('unanswered_queries', {
    id: 'id',
    query_text: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
};

export const down = (pgm) => {
  pgm.dropTable('unanswered_queries');
};
