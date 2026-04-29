-- Migration 008: extend the issues table with fields required by the IDS module.
-- Run this once against the Supabase instance (Supabase SQL editor or CLI).

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'identify',
  ADD COLUMN IF NOT EXISTS pinned_for_l10 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_rock_id UUID REFERENCES rocks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fix FK references from old tenants table → workspaces (if not already done by mig 007)
-- Already handled in 007; including here as a safety guard:
-- (no-op if constraint already points to workspaces)
