# DailyManager Super Admin and payment provider setup

## Super Admin bootstrap

Platform administration is separate from workspace owner/admin roles. Access is granted by the `platform_admin_users` table, not by a client-side email check. Migration `008_platform_admin_users.sql` creates the allowlist and seeds the existing `squadempireng@gmail.com` account. The API checks the signed-in user's database ID against that table on every Super Admin request.

The Super Admin console is at `/super-admin`. To save provider credentials, configure `DAILYMANAGER_CREDENTIAL_ENCRYPTION_KEY` in Vercel as a randomly generated 32-byte key encoded as 64 hexadecimal characters (generate it locally with `openssl rand -hex 32`). Do not send it in chat, commit it, or use a `NEXT_PUBLIC_` prefix. Redeploy after setting it.

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

DailyManager uses Test mode on every deployment by default, including Vercel Production. The application only selects Live credentials when `DAILYMANAGER_PAYMENT_MODE=live` is explicitly set in the deployment environment. Leave this variable unset during sandbox verification. Never enable live mode or run a live charge without explicit approval.

## Bachs.io

Create two recurring products in Bachs (monthly and annual) and copy their product IDs into the matching environment in the console. Configure:

- Secret API key (`sk_sandbox_...` for test; `sk_live_...` for live)
- Webhook signing secret from the Bachs Developer Portal
- Monthly and annual recurring product IDs
- Matching monthly and annual amounts
- Currency

Bachs webhook URL:

`https://dailymanager-neon.vercel.app/api/billing/bachs/webhook`

Subscribe to `collection.succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted` when available. The latter lifecycle events are not yet fully reconciled by DailyManager. Bachs recommends webhook-based fulfillment, not trusting the browser redirect. The webhook handler uses `webhooks.constructEvent` from the official `@bachs/sdk` package to verify the untouched request body and signed headers. The handler deduplicates event IDs and only activates a subscription after a verified `collection.succeeded` event. Bachs recurring subscriptions are configured as USD-only in DailyManager. Bachs documents USD card as the supported recurring subscription route for Nigerian merchants; the integration rejects NGN Bachs subscription configuration.

## Important launch limitation

The current webhook handlers confirm initial successful checkout payments. They do not yet fully reconcile recurring renewal invoices, failed renewal attempts, grace periods, provider-side cancellations, or plan changes for either provider. Bachs documents that recurring renewals and failed-payment recovery generate additional subscription/invoice lifecycle events; these need explicit handlers and sandbox verification before recurring billing can be enabled for real workspaces.

The new provider settings UI and API are committed. The Bachs integration uses the official `@bachs/sdk` package, which requires Node.js 22 or later. They are not production-ready until the encryption key is configured, the Vercel deployment is verified, and both providers pass sandbox checkout, webhook, duplicate-delivery, failed-payment, renewal, refund, and cancellation tests. No live payment has been initiated.
