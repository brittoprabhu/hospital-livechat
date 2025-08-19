// migrations/XXXX_add_faq_fulltext_trigger.js
/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  
  // Create function to update tsvector
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_faq_tsvector()
    RETURNS trigger AS $$
    BEGIN
      NEW.ts :=
        setweight(to_tsvector('simple', unaccent(coalesce(NEW.question, ''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.keywords, ' '), ''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW.tags, ' '), ''))), 'C');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger on insert or update
  pgm.sql(`
    CREATE TRIGGER trg_update_faq_tsvector
    BEFORE INSERT OR UPDATE ON faq_entries
    FOR EACH ROW
    EXECUTE PROCEDURE update_faq_tsvector();
  `);

  // Create index on ts
  pgm.sql(`CREATE INDEX IF NOT EXISTS faq_entries_ts_idx ON faq_entries USING GIN (ts);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_update_faq_tsvector ON faq_entries;`);
  pgm.sql(`DROP FUNCTION IF EXISTS update_faq_tsvector;`);
  
};
