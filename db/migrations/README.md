# Database migrations

DailyManager uses PostgreSQL. Apply migration files in filename order using the database provider's SQL editor or a trusted migration runner.

## Existing database upgrade

1. Take a database backup or snapshot.
2. Open the SQL editor for the database configured by `DATABASE_URL`.
3. Review and run `002_workspace_collaboration.sql` in full.
4. Confirm the `assigned_to` column and the `task_comments`, `workspace_notifications`, and `workspace_activity` tables exist.
5. Review and run `003_workspace_invitations.sql` in full.
6. Confirm the `workspace_invitations` table and its indexes exist.
7. Only then consider removing the compatibility schema checks from API request handlers.

Both migrations are idempotent and can be retried after a partial run. They do not delete application data. Migration 003 creates invitation storage only; it does not add email delivery or verify account email ownership.

## Fresh database

Run `../schema.sql` first, then run all numbered migrations in order. Migration 003 is safe on a fresh database because it uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

## Deployment safety

Do not automatically execute schema migrations from a public request handler. Apply them as a controlled deployment/database operation, verify the result, then deploy application code that depends on the new schema.

The current application still contains compatibility checks for older databases. They are intentionally retained until the migrations have been applied to the connected production database and verified.
