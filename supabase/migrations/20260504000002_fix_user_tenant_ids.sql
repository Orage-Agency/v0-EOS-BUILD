-- ════════════════════════════════════════════════════════════════════════
-- Repoint user_tenant_ids() at the canonical workspace tables
-- ════════════════════════════════════════════════════════════════════════
-- The original function in scripts/004_rls.sql read from `tenant_memberships`
-- and `tenants`, which the codebase migrated away from in favor of
-- `workspace_memberships` and `workspaces`. The migration kept the RLS
-- policies but never updated the helper, so every policy that used it
-- evaluated `tenant_id = ANY([])` — silently false for every row.
--
-- The app only kept working because every server action routes through
-- the service-role admin client which bypasses RLS. If any code path
-- ever switched to the anon client (e.g. a future API for end-clients
-- to access their own data), every read/write would have failed silently.
--
-- This rewrites the function to read from the canonical tables. The
-- policy bodies don't need to change — they reference the same function.
-- `is_master` lives on `profiles` not `users`, so we look it up there.

CREATE OR REPLACE FUNCTION public.user_tenant_ids(uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY(
    SELECT workspace_id
      FROM workspace_memberships
     WHERE user_id = uid AND status = 'active'
    UNION
    -- Cross-workspace `master` (Orage staff) gets everything.
    SELECT id FROM workspaces
     WHERE EXISTS (
       SELECT 1 FROM profiles WHERE id = uid AND is_master = true
     )
  );
$$;
