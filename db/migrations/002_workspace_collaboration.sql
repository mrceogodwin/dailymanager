-- 002_workspace_collaboration.sql
-- Apply once to an existing DailyManager PostgreSQL database before deploying
-- code that relies on assignments, comments, notifications, and activity history.
-- All statements are idempotent so a partially completed migration can be retried.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;

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

CREATE TABLE IF NOT EXISTS workspace_notifications (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workspace_notifications_user_created_idx
  ON workspace_notifications (workspace_id, user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS workspace_activity (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL DEFAULT 'Workspace member',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $dm$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'workspace_activity'
       AND column_name = 'workspace_id'
       AND data_type <> 'text'
  ) THEN
    ALTER TABLE workspace_activity
      ALTER COLUMN workspace_id TYPE TEXT USING workspace_id::text;
  END IF;
END;
$dm$;

CREATE INDEX IF NOT EXISTS workspace_activity_workspace_created_idx
  ON workspace_activity (workspace_id, created_at DESC, id DESC);
