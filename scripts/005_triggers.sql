-- ============================================================================
-- ORAGE CORE · 005 · TRIGGERS · updated_at automation
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_rocks   ON rocks;
DROP TRIGGER IF EXISTS touch_tasks   ON tasks;
DROP TRIGGER IF EXISTS touch_notes   ON notes;
DROP TRIGGER IF EXISTS touch_tenants ON tenants;

CREATE TRIGGER touch_rocks   BEFORE UPDATE ON rocks   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_tasks   BEFORE UPDATE ON tasks   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_notes   BEFORE UPDATE ON notes   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
