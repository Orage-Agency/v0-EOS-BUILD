-- ═══════════════════════════════════════════════════════════
-- workspace_invites.temp_password
-- ═══════════════════════════════════════════════════════════
-- Stores the auto-generated fallback password for an invitee. When the
-- admin sends an invite, we pre-create the auth user with this password
-- and store it here so the inviter can recover it from the members UI
-- (e.g., to text it to the invitee out-of-band when email fails).
--
-- The value is plaintext on purpose:
--   • It's only readable by workspace admins (existing RLS scopes
--     workspace_invites by workspace_id + role).
--   • It's short-lived — invites expire in 14 days and the column is
--     nulled once the invite is accepted (the user's chosen password
--     becomes canonical).
--   • Anyone who can read this column can also generate a fresh invite
--     link, so plaintext doesn't widen the blast radius.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE workspace_invites
  ADD COLUMN IF NOT EXISTS temp_password TEXT;

COMMENT ON COLUMN workspace_invites.temp_password IS
  'Fallback password generated at invite time. Cleared on accept.';
