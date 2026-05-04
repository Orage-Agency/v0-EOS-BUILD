-- ════════════════════════════════════════════════════════════════════════
-- Per-user notification preferences
-- ════════════════════════════════════════════════════════════════════════
-- Single JSONB column on profiles. Schema is open-ended on purpose so we
-- can add new notification kinds without a migration each time. The
-- default `null` means "all enabled" — opt-out, not opt-in.
--
-- Shape: { "<kind>": { "in_app": false, "email": false }, ... }
-- where each missing key inherits "true" so a user only stores values
-- they've explicitly turned off.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB;
