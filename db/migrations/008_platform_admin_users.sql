-- Database-backed platform Super Admin allowlist.
-- This grants platform access only to explicitly inserted user accounts.
CREATE TABLE IF NOT EXISTS platform_admin_users (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_admin_users (user_id)
SELECT id FROM app_users
WHERE lower(email) = lower('squadempireng@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
