-- 004_workspace_collaboration_compatibility.sql
-- Adds the two collaboration tables missing from the inspected production schema
-- and permits the viewer role used by workspace invitations and member management.
-- This migration is idempotent. Back up the database before applying.

CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_comments_task_created_idx
  ON task_comments (workspace_id, task_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_created_idx
  ON workspace_invitations (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_one_pending_per_email_idx
  ON workspace_invitations (workspace_id, LOWER(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS workspace_invitations_pending_email_idx
  ON workspace_invitations (LOWER(email), expires_at)
  WHERE status = 'pending';

ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'guest', 'viewer'));
