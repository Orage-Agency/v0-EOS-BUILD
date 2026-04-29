-- ============================================================================
-- ORAGE CORE · 003 · BUSINESS SCHEMA
-- VTO, Accountability, Rocks, Tasks, Issues, Scorecard, Notes, Meetings,
-- AI, Integrations, Calendar, Activity Log
-- ============================================================================

-- VTO -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vto_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  locked_sections TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, version)
);
CREATE INDEX IF NOT EXISTS idx_vto_tenant ON vto_documents(tenant_id, is_current);

-- Accountability Chart --------------------------------------------------------
CREATE TABLE IF NOT EXISTS accountability_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  parent_role_id UUID REFERENCES accountability_roles(id),
  person_id UUID REFERENCES users(id),
  responsibilities TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON accountability_roles(tenant_id);

-- Rocks -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  role_id UUID REFERENCES accountability_roles(id),
  parent_rock_id UUID REFERENCES rocks(id),
  quarter TEXT NOT NULL,
  start_date DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tag TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rocks_tenant  ON rocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rocks_owner   ON rocks(owner_id);
CREATE INDEX IF NOT EXISTS idx_rocks_quarter ON rocks(tenant_id, quarter);

CREATE TABLE IF NOT EXISTS rock_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rock_id UUID NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  order_idx INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_milestones_rock ON rock_milestones(rock_id);

-- Tasks -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  parent_rock_id UUID REFERENCES rocks(id),
  parent_issue_id UUID,            -- wired below
  parent_note_id UUID,             -- wired below
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'med',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  calendar_event_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner  ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks(due_date) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS task_handoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  context_note TEXT NOT NULL,
  attached_note_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handoffs_task ON task_handoffs(task_id);

-- Issues ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  rank INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  source_type TEXT,
  source_id UUID,
  ai_generated BOOLEAN DEFAULT false,
  solved_at TIMESTAMPTZ,
  solution_note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issues_tenant ON issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issues_open
  ON issues(tenant_id, status) WHERE status = 'open';

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_issue FOREIGN KEY (parent_issue_id) REFERENCES issues(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Scorecard -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  goal_value NUMERIC NOT NULL,
  goal_op TEXT NOT NULL,
  goal_value_secondary NUMERIC,
  unit TEXT,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  display_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scorecard_tenant
  ON scorecard_metrics(tenant_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS scorecard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  value NUMERIC,
  status_override TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_entries_metric_period
  ON scorecard_entries(metric_id, period_start DESC);

-- Notes -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  parent_type TEXT,
  parent_id UUID,
  is_pinned BOOLEAN DEFAULT false,
  folder TEXT,
  embedding vector(1536),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_tenant     ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent     ON notes(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes USING gin (title gin_trgm_ops);

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_note FOREIGN KEY (parent_note_id) REFERENCES notes(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS note_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON note_links(target_type, target_id);

CREATE TABLE IF NOT EXISTS note_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON note_mentions(user_id, notified_at);

-- Meetings --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  agenda JSONB,
  summary_text TEXT,
  rating_average NUMERIC,
  attendee_ids UUID[],
  calendar_event_id UUID,
  created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_meetings_tenant ON meetings(tenant_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS meeting_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  captured_by UUID REFERENCES users(id),
  converted_to_type TEXT,
  converted_to_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_captures_meeting ON meeting_captures(meeting_id);

-- AI --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_nudges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_nudges_user   ON ai_nudges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_nudges_tenant ON ai_nudges(tenant_id, status);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON ai_conversations(user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  summary JSONB NOT NULL,
  sources JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period)
);

-- Integrations ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_payload BYTEA NOT NULL,
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  external_id TEXT,
  provider TEXT NOT NULL DEFAULT 'google',
  title TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sync_state TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_calendar_source ON calendar_events(source_type, source_id);

-- Activity Log ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_tenant_recent
  ON activity_log(tenant_id, created_at DESC);
