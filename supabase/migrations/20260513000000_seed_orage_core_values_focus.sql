-- ════════════════════════════════════════════════════════════════════════
-- Seed: Orage workspace · Core Values + Core Focus
-- ════════════════════════════════════════════════════════════════════════
-- Populates workspaces.vto_data for slug='orage' with the agency's official
-- core values and core focus (Purpose/Cause/Passion + Niche). Idempotent —
-- re-running overwrites the three keys but preserves any other VTO fields
-- already set on the row.

UPDATE workspaces
SET vto_data = COALESCE(vto_data, '{}'::jsonb) || jsonb_build_object(
  'coreValues', jsonb_build_array(
    jsonb_build_object(
      'id', 'cv_orage_aligned',
      'name', 'We are Aligned with our Execution',
      'description', 'We follow directions. We are active listeners. We ask clarifying questions to ensure our understanding of the vision and mission.'
    ),
    jsonb_build_object(
      'id', 'cv_orage_passionate',
      'name', 'We are Passionate',
      'description', 'We love what we do. We are driven. We are self starters. We are hard workers.'
    ),
    jsonb_build_object(
      'id', 'cv_orage_trustworthy',
      'name', 'We are Trustworthy',
      'description', 'We do what we say we are going to do. We are reliable. We have honest communication with our team and clients. We are accountable and take responsibility for our actions.'
    ),
    jsonb_build_object(
      'id', 'cv_orage_critical',
      'name', 'We are Critical Thinkers',
      'description', 'We think before we act. We analyze our options to develop solutions.'
    ),
    jsonb_build_object(
      'id', 'cv_orage_fun',
      'name', 'We have Fun',
      'description', 'We bring positive energy into the room and we enjoy the process.'
    )
  ),
  'purpose', 'We create opportunities, tools, and skills that help people build better lives through business.',
  'niche', E'• We Create AI Enabled Companies.\n• Tailoring AI to work for your business.\n• Simplify business operations using AI.'
)
WHERE slug = 'orage';
