# Workspace backup recovery

## Current release scope

The `/restore` screen supports local inspection of version 1 DailyManager workspace exports and on-device backups. The owner-only `POST /api/workspace/restore/preview` endpoint performs a read-only comparison against the active workspace.

The preflight checks:

- backup format and version;
- workspace identity (the active workspace must match the backup);
- a 15 MB request limit and a 10,000-record review limit;
- record collection shape and required project/task/note/comment IDs;
- task-to-project and comment-to-task references;
- existing project, task, note and comment IDs;
- member matching by normalized email and assignee references.

The endpoint returns `preview_only: true` and `writes_performed: false`. It does not mutate the database.

## Recovery policy before enabling writes

A future recovery operation must be append-only. It must never truncate, delete, or overwrite current workspace records.

1. Require an authenticated workspace owner and same-origin request.
2. Re-validate the uploaded backup on the server; never trust client preview results.
3. Require a fresh, explicit confirmation tied to the exact backup digest, target workspace ID and preflight result.
4. Start a PostgreSQL transaction and lock the target workspace row.
5. Generate new database IDs for imported projects, tasks, notes and comments. Do not reuse source IDs.
6. Build a source-project-ID to new-project-ID map, then a source-task-ID to new-task-ID map.
7. Map users by normalized email only. Never import user accounts, password hashes, sessions, invitations or role grants. Unmatched assignees must become unassigned.
8. Insert parent records before dependent records. Roll back the entire transaction on any failure.
9. Exclude billing payments, subscription/customer records, provider identifiers, historical activity and pending offline mutation replay. These require separate audited workflows and must not be replayed as ordinary content.
10. Record an audit event for the recovery operation without copying untrusted historical actor identities.
11. Return inserted counts and a recovery operation identifier only after commit.
12. Add idempotency protection so retrying a request cannot duplicate a completed import.

## Current limitation

There is intentionally no restore-write endpoint or restore button yet. The preview is a safety and planning step, not a promise that any backup has been restored. Do not deploy a write path until schema compatibility, transactional behavior, ID mapping and integration tests have been reviewed against a disposable PostgreSQL database.
