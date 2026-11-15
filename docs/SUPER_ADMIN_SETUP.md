# DailyManager Super Admin and payment provider setup

## Super Admin bootstrap

Platform administration is separate from workspace owner/admin roles. To enable the first platform administrator, add these Vercel environment variables to the DailyManager project:

- `DAILYMANAGER_SUPER_ADMIN_EMAIL` — the exact email address of the account that should receive platform Super Admin access. Multiple addresses may be comma-separated.
- `DAILYMANAGER_CREDENTIAL_ENCRYPTION_KEY` — a randomly generated 32-byte key encoded as 64 hexadecimal characters. Generate it locally with `openssl rand -hex 32`.

Do not send either value in chat, commit them, or use a `NEXT_PUBLIC_` prefix. Redeploy after setting them. The Super Admin console is at `/super-admin`.

Provider secrets are encrypted with AES-256-GCM before being written to Neon. The encryption key is not stored in Neon. Existing credentials are never returned to the browser; enter a new value only when setting or rotating it.

## Database migration

The console requires `db/migrations/006_platform_admin_payment_config.sql`. Apply it only after taking a fresh Neon snapshot and checking that the production ID types still match the migration. The current Neon snapshot limit prevented creating a new pre-change snapshot during this implementation pass, so this migration has deliberately NOT been applied to production.

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

Subscribe at minimum to `collection.succeeded`. Bachs recommends webhook-based fulfillment, not trusting the browser redirect. Its webhook signature uses HMAC-SHA256 over `{timestamp}.{raw_body}`; the handler validates the timestamp and signature before processing. Bachs currently documents recurring subscriptions as USD-card only unless NGN recurring billing has been enabled for the merchant account. Confirm this with Bachs before using an NGN recurring product.

## Important launch limitation

The new provider settings UI and API are committed, but they are not production-ready until migration 006 is applied, Super Admin bootstrap variables are configured, the Vercel deployment is verified, and both providers pass sandbox checkout, webhook, duplicate-delivery, failed-payment, and renewal tests. No live payment has been initiated.
