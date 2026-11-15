-- Ensure newly created workspaces receive a recorded trial start.
-- Existing workspaces are untouched: setting a column default does not backfill rows.
ALTER TABLE workspaces
  ALTER COLUMN trial_started_at SET DEFAULT NOW();
