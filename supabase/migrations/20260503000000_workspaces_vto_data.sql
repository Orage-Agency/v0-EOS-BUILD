-- Onboarding wizard writes V/TO answers to workspaces.vto_data via
-- saveVTOData(). The column was missing in production, so the wizard
-- silently dropped purpose, niche, 10-year target, core values, and
-- 1-year goals. Adding it now.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS vto_data JSONB;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
