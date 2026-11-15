# Paystack configuration

DailyManager supports workspace-level subscriptions through Paystack. The platform Super Admin configures credentials and plan details in `/super-admin`; workspace owners then choose monthly or annual checkout in Workspace Settings.

## One-time platform bootstrap

See [Super Admin setup](./SUPER_ADMIN_SETUP.md). Set the bootstrap email allowlist and AES-256-GCM encryption key in Vercel. Do not place provider credentials in source code or send them in chat.

## Configure Paystack in Super Admin

Open `/super-admin`, select Paystack, then configure Test and Live separately:

- Secret key (server-side only)
- Optional webhook signing secret; if omitted, the secret API key is used
- Monthly and annual Paystack plan codes
- Exact amounts in kobo matching those plans
- Currency

Credentials are encrypted before storage in Neon and are never returned to the browser after saving.

## Webhook

Register this URL in the corresponding Paystack environment:

`https://dailymanager-neon.vercel.app/api/billing/webhook`

The webhook validates Paystack's HMAC SHA-512 signature against the raw request body. Duplicate events are idempotent. Bachs uses the official `@bachs/sdk` webhook verifier and requires Node.js 22 or later. A payment is activated only after the stored checkout reference, amount and currency are verified.

## API routes

- `POST /api/billing/initialize` — owner-only Paystack checkout.
- `POST /api/billing/verify` — owner-only server-to-server transaction verification.
- `POST /api/billing/webhook` — signed webhook processing.
- `GET /api/billing/status` — owner-only billing state and payment history.
- `GET /api/workspace/export` — owner-only workspace JSON export.

Do not initiate live charges until the schema migration is applied, Super Admin is configured, the Vercel deployment is verified, and sandbox tests pass.
