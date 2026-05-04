-- ════════════════════════════════════════════════════════════════════════
-- Notes full-text search
-- ════════════════════════════════════════════════════════════════════════
-- Title-only ilike was fine at 50 notes; once a workspace has hundreds
-- of meeting notes / docs the user wants to find anything by content.
-- Generated tsvector column + GIN index gives us native PG full-text
-- search without an external service.
--
-- The body comes out of the JSONB content array — we concatenate every
-- block's html field, strip tags, and feed it to to_tsvector. Title is
-- weighted A (highest), body B, so a hit in the title still ranks first.

-- Postgres forbids subqueries in generated-column expressions, so we
-- can't extract just the `html` block fields. Instead the simpler form:
-- concatenate the entire JSONB content as text and let the tokenizer
-- pull words out. Block keys ("html", "p") become noise tokens but the
-- match quality is still strong for natural-language content.

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A')
      || setweight(
        to_tsvector(
          'simple',
          regexp_replace(
            coalesce(content::text, ''),
            '<[^>]+>',
            ' ',
            'g'
          )
        ),
        'B'
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_notes_search_tsv ON notes USING GIN (search_tsv);
