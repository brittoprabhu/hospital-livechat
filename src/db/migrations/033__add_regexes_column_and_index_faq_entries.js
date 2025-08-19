/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  // Add regexes column if not exists
  
  pgm.addColumn('faq_entries', {
    regexes: { type: 'text[]', default: '{}', notNull: true }
  });

  // Add the `ts` column without generation
  pgm.addColumn('faq_entries', {
    ts: { type: 'tsvector' }
  });

  // Create function to populate `ts` field
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_faq_entries_ts()
    RETURNS trigger AS $$
    BEGIN
      NEW.ts := 
        setweight(to_tsvector('simple', unaccent(coalesce(NEW.question, ''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.keywords, ' '), ''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.tags, ' '), ''))), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Add trigger to keep `ts` updated
  pgm.sql(`
    CREATE TRIGGER faq_entries_ts_trigger
    BEFORE INSERT OR UPDATE ON faq_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_entries_ts();
  `);

  // Create indexes for search
  pgm.sql(`CREATE INDEX IF NOT EXISTS faq_entries_ts_idx ON faq_entries USING GIN (ts);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS faq_entries_keywords_idx ON faq_entries USING GIN (keywords);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS faq_entries_tags_idx ON faq_entries USING GIN (tags);`);
};

export const down = (pgm) => {
  pgm.dropTrigger('faq_entries', 'faq_entries_ts_trigger');
  pgm.sql(`DROP FUNCTION IF EXISTS update_faq_entries_ts();`);
  pgm.dropColumns('faq_entries', ['ts', 'regexes']);
};
