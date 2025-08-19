export const up = (pgm) => {
  // Add keywords column (array of text)
  pgm.addColumn('faq_entries', {
    keywords: { type: 'text[]', notNull: false }
  });

  // Create a GIN index for fast searching in the keywords array
  pgm.createIndex('faq_entries', 'keywords', {
    method: 'gin'
  });
};

export const down = (pgm) => {
  // Drop index first, then column
  pgm.dropIndex('faq_entries', 'keywords', { method: 'gin' });
  pgm.dropColumn('faq_entries', 'keywords');
};
