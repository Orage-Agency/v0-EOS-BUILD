-- ═══════════════════════════════════════════════════════════
-- 20260506000001_mfa_trusted_devices.sql
--
-- "Remember this device for 30 days" — bypass the TOTP prompt on
-- subsequent sign-ins from a device the user has already verified.
--
-- Threat model:
--   • Token is opaque random 32 bytes, stored only as SHA-256 hash so a
--     DB leak doesn't grant device-bypass on every customer.
--   • Token is bound to (user_id) — a stolen token won't work on a
--     different account even if the cookie is replayed.
--   • Token expires after 30 days. The user can revoke all from the
--     security settings page.
--   • Cookie is HTTPOnly + Secure + SameSite=Lax + Path=/login so it
--     only ever rides the auth handshake.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- SHA-256 hex of the random token. Lookup uses (user_id, token_hash).
  token_hash TEXT NOT NULL,
  -- Free-text device label so the user can identify devices in the
  -- security settings ("Macbook Air · Safari", "iPhone").
  label TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mfa_trusted_devices_token
  ON mfa_trusted_devices(user_id, token_hash);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user
  ON mfa_trusted_devices(user_id, expires_at DESC);

ALTER TABLE mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mfa_trusted_devices_owner ON mfa_trusted_devices;
CREATE POLICY mfa_trusted_devices_owner ON mfa_trusted_devices
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
