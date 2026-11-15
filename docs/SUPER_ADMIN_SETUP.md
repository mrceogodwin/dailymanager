# DailyManager Super Admin and payment provider setup

## Super Admin bootstrap

Platform administration is separate from workspace owner/admin roles. To enable the first platform administrator, add these Vercel environment variables to the DailyManager project:

- `DAILYMANAGER_SUPER_ADMIN_EMAIL` — the exact email address of the account that should receive platform Super Admin access. Multiple addresses may be comma-separated.
- `DAILYMANAGER_CREDENTIAL_ENCRYPTION_KEY` — a randomly generated 32-byte key encoded as 64 hexadecimal characters. Generate it locally with `openssl rand -hex 32`.

Do not send either value in chat, commit them, or use a `NEXT_PUBLIC_` prefix. Redeploy after setting them. The Super Admin console is at `/super-admin`.

Provider secrets are encrypted with AES-256-GCM before being written to Neon. The encryption key is not stored in Neon. Existing credentials are never returned to the browser; enter a new value only when setting or rotating it.

## Database migration

The console requires `db/migrations/006_platform_admin_payment_config.sql`. Apply it only after taking a fresh Neon snapshot and checking that the production ID types still match the migration. The current Neon snapshot limit prevented creating a new manual snapshot. A separate Neon branch was created from the current production branch before the additive migration was applied; that branch is retained as a point-in-time test copy. Migration 006 has now been applied to production and its table schema has been verified.

## Paystack

In `/super-admin`, select Paystack and configure separate Test and Live settings:

- Secret key
- Optional separate webhook signing secret (defaults to the secret key)
- Monthly and annual plan codes
- Exact monthly and annual amounts in kobo
- Currency (NGN or USD; the current DailyManager Paystack billing record path is NGN)

Register this webhook URL in Paystack:

`https://dailymanager-neon.vercel.app/api/billing/webhook`

Only use test credentials in non-production environments and live credentials in Production. Never run a live charge without explicit approval.

## Bachs.io

Create two recurring products in Bachs (monthly and annual) and copy their product IDs into the matching environment in the console. Configure:

- Secret API key (`sk_sandbox_...` for test; `sk_live_...` for live)
- Webhook signing secret from the Bachs Developer Portal
- Monthly and annual recurring product IDs
- Matching monthly and annual amounts
- Currency

Bachs webhook URL:

`https://dailymanager-neon.vercel.app/api/billing/bachs/webhook`

Subscribe at minimum to `collection.succeeded`. Bachs recommends webhook-based fulfillment, not trusting the browser redirect. The webhook handler uses `webhooks.constructEvent` from the official `@bachs/sdk` package to verify the untouched request body and signed headers. The handler deduplicates event IDs and only activates a subscription after a verified `collection.succeeded` event. Bachs recurring subscriptions are configured as USD-only in DailyManager. Bachs documents USD card as the supported recurring subscription route for Nigerian merchants; the integration rejects NGN Bachs subscription configuration.

## Important launch limitation

The new provider settings UI and API are committed. The Bachs integration uses the official `@bachs/sdk` package, which requires Node.js 22 or later. They are not production-ready until migration 006 is applied, Super Admin bootstrap variables are configured, the Vercel deployment is verified, and both providers pass sandbox checkout, webhook, duplicate-delivery, failed-payment, and renewal tests. No live payment has been initiated.
