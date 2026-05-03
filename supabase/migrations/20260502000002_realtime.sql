-- Add the collab-relevant tables to the supabase_realtime publication so
-- the client can subscribe to row-level INSERT / UPDATE / DELETE events.
--
-- ALTER PUBLICATION ... ADD TABLE is idempotent only via the catalog check
-- because Supabase doesn't expose IF NOT EXISTS for publication members,
-- so we wrap each statement in a DO block.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rocks', 'rock_milestones', 'tasks', 'issues',
    'scorecard_metrics', 'scorecard_entries', 'notifications',
    'notes', 'meetings', 'vto_documents', 'accountability_roles'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END$$;
