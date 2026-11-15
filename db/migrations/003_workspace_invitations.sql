-- 003_workspace_invitations.sql
-- Apply once to an existing DailyManager PostgreSQL database before enabling
-- workspace invitation management. Back up the database before applying.
-- This migration creates the invitation records and lookup/uniqueness indexes.
-- It does not send email or verify account email ownership.

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

UPDATE workspace_invitations
   SET status = 'expired'
 WHERE status = 'pending'
   AND expires_at <= NOW();
