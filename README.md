# DailyManager

A premium, responsive workspace for personal productivity: tasks, projects, notes and planning.

## Stack

- Next.js 14 App Router and React 18
- PostgreSQL / Neon
- `pg` for database access, `bcryptjs` for password hashing, and Lucide icons

## Features in the current codebase

- Signup and login endpoints with bcrypt password hashing
- Server-side sessions using random tokens stored as SHA-256 hashes in PostgreSQL and HttpOnly cookies
- Workspace, membership, task, project and note persistence
- Workspace-scoped task/project/note writes and task status updates
- Database-backed throttling for repeated authentication attempts
- Responsive dashboard with search, overview metrics, task completion, project and note views
- Next.js Vercel framework configuration

## Required environment

Set `DATABASE_URL` in the deployment environment to the Neon PostgreSQL connection string for the intended database. Keep it server-only; do not use a `NEXT_PUBLIC_` variable for database credentials.

The baseline schema is documented in `db/schema.sql`. For a fresh PostgreSQL/Neon database, review that file and apply it with `psql "$DATABASE_URL" -f db/schema.sql`. For an existing database, inspect the current table definitions and column types first: this baseline uses `BIGINT` identity IDs and `CREATE TABLE IF NOT EXISTS` will not repair mismatched existing tables. Never run schema changes against production until you have confirmed the target database and backed up important data. Verify that Vercel's `DATABASE_URL` points to the intended database before testing signup/login.

## Run locally

```bash
npm install
npm run dev
```

## Deployment and verification

Connect the repository's `main` branch to the existing DailyManager Vercel project. Use the Next.js framework preset and leave the output directory at its default. After deployment, verify signup, login, logout, task creation/completion, project creation and note creation against the production database.

## Not yet production-complete

Email verification and password reset, team invitations/permissions, subscription checkout and webhook verification, billing administration, calendar integrations and advanced tool modules are not finished. Do not represent these as available features or charge users until implemented and tested.
