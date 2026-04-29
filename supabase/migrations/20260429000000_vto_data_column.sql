-- Add vto_data JSONB column to workspaces for VTO persistence
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS vto_data JSONB DEFAULT NULL;

COMMENT ON COLUMN workspaces.vto_data IS 'Full VTO document snapshot — serialised from useVTOStore';
