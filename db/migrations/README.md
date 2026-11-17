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


## Workspace billing foundation

5. Review and run `005_workspace_billing.sql` after confirming the production workspace and billing tables use UUID workspace IDs.
6. Verify `workspaces.trial_started_at`, the seven-day default for newly created workspaces, the additional billing customer fields, and the `billing_payments` and `billing_webhook_events` tables.
7. Existing workspace plan and trial timestamps are preserved. The migration does not grant existing workspaces a new trial.
8. Do not enable Paystack checkout until the Paystack secret key, approved plan codes/prices, webhook URL, and production environment variables are configured and verified. Never expose the secret key to client-side code.


## Paid-period expiry

9. Review and run `009_billing_period_expiry.sql` after confirming the `billing_customers` table exists and uses UUID workspace IDs.
10. Verify `billing_customers.current_period_end` and the partial expiry index exist before deploying code that reconciles expired entitlements.
11. The application preserves Team access until the recorded paid period ends after cancellation or a failed renewal. Expired trials and expired paid periods are reconciled to the Free plan on the next authenticated workspace request.
12. This migration is not applied automatically. Back up Neon, review the target schema, apply it deliberately, and verify the column/index before enabling the corresponding release.
