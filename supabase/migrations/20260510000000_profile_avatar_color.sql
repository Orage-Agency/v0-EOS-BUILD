-- Profile self-service avatar color. NULL means "use the deterministic
-- per-id default" — picking a color writes a small token (e.g. `pink`,
-- `green`, `white`) that maps to a CSS class on .avatar.<token>.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_color text;
