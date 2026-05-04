-- ════════════════════════════════════════════════════════════════════════
-- Seed: Orage Agency client workspaces
-- ════════════════════════════════════════════════════════════════════════
-- Creates the four client workspaces George manages, with brand colors
-- that drive the colored-dot client tag in the agency's task/rock UI.
-- George is added as `founder` in each so the workspace switcher lists
-- them and the cross-workspace picker can offer them as tag targets.
--
-- Idempotent: ON CONFLICT (slug) DO UPDATE keeps brand colors fresh on
-- re-run; membership insert uses NOT EXISTS so re-running is a no-op.

INSERT INTO workspaces (slug, name, brand_color, status)
VALUES
  ('quintessa-marketing',  'Quintessa Marketing',     '#0a0a0a', 'active'),
  ('boomer',               'Boomer',                  '#3B82F6', 'active'),
  ('okc-onsite-detailing', 'OKC On-site Detailing',   '#DC2626', 'active'),
  ('eos-bobby-schneider',  'EOS Bobby Schneider',     '#10B981', 'active')
ON CONFLICT (slug) DO UPDATE
  SET brand_color = EXCLUDED.brand_color,
      name        = EXCLUDED.name;

-- Set Orage's own brand color so the agency's "internal" indicator can
-- render it too if we ever want to surface it (today the dot is
-- suppressed for internal tasks).
UPDATE workspaces SET brand_color = '#E4AF7A' WHERE slug = 'orage' AND brand_color IS NULL;

-- Add George as founder in each client workspace so they show up in his
-- switcher and in the client-tag picker.
INSERT INTO workspace_memberships (workspace_id, user_id, role, status)
SELECT w.id, p.id, 'founder', 'active'
FROM workspaces w
CROSS JOIN profiles p
WHERE w.slug IN ('quintessa-marketing', 'boomer', 'okc-onsite-detailing', 'eos-bobby-schneider')
  AND p.email = 'georgemoffat@orage.agency'
  AND NOT EXISTS (
    SELECT 1 FROM workspace_memberships m
    WHERE m.workspace_id = w.id AND m.user_id = p.id
  );
