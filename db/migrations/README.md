# Database migrations

DailyManager uses PostgreSQL. Apply migration files in filename order using the database provider's SQL editor or a trusted migration runner.

## Existing database upgrade

1. Take a database backup or snapshot.
2. Open the SQL editor for the database configured by `DATABASE_URL`.
3. Review and run `002_workspace_collaboration.sql` in full.
4. Confirm the `assigned_to` column and the `task_comments`, `workspace_notifications`, and `workspace_activity` tables exist.
5. Only then consider removing the compatibility schema checks from API request handlers.

The migration is idempotent and can be retried after a partial run. It does not delete application data.

## Fresh database

Run `../schema.sql` first, then run all numbered migrations in order.

## Deployment safety

Do not automatically execute schema migrations from a public request handler. Apply them as a controlled deployment/database operation, verify the result, then deploy application code that depends on the new schema.

The current application still contains compatibility checks for older databases. They are intentionally retained until the migration has been applied to the connected production database and verified.
