-- ═══════════════════════════════════════════════════════════
-- 20260505000000_onboarding_draft.sql
-- Persist the onboarding wizard's in-progress state across refreshes.
-- The wizard used to live entirely in a Zustand store, so a refresh
-- between steps reset back to step 1. This stamps each `patch()` to
-- profiles.onboarding_draft jsonb (debounced server-side).
--
-- Also dedupes the two competing onboarding_completed_at columns.
-- profiles is canonical (per-user, since invitees onboard themselves
-- separately from the founder). The workspaces column was added in
-- 20260503000000 but `completeOnboarding` only ever wrote to profiles.
-- We keep the workspaces column NULL-tolerant for backwards-compat but
-- drop the unused column comment so future contributors don't pick the
-- wrong one.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_draft jsonb;

COMMENT ON COLUMN profiles.onboarding_draft IS
  'Onboarding wizard in-progress draft (step + collected fields). Cleared by completeOnboarding.';

-- Make the canonical timestamp explicit; the workspaces column stays
-- but is now documented as deprecated.
COMMENT ON COLUMN profiles.onboarding_completed_at IS
  'Canonical onboarding completion timestamp (per-user). Writes happen via completeOnboarding server action.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'onboarding_completed_at'
  ) THEN
    EXECUTE $cmt$
      COMMENT ON COLUMN workspaces.onboarding_completed_at IS
        'DEPRECATED — never written to. Use profiles.onboarding_completed_at. Kept for backwards compatibility with existing client code.'
    $cmt$;
  END IF;
END
$$;
