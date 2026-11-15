# Paystack configuration

DailyManager uses workspace-level subscriptions. A workspace owner starts checkout; all members share that workspace entitlement.

## Required server-only environment variables

Set these in the DailyManager Vercel project for the appropriate environments:

- `PAYSTACK_SECRET_KEY` — Paystack secret key. Never prefix with `NEXT_PUBLIC_`.
- `PAYSTACK_PLAN_MONTHLY` — Paystack plan code for the monthly subscription.
- `PAYSTACK_PLAN_ANNUAL` — Paystack plan code for the annual subscription.
- `DAILYMANAGER_PLAN_MONTHLY_AMOUNT_KOBO` — exact monthly plan amount in kobo, matching the Paystack plan.
- `DAILYMANAGER_PLAN_ANNUAL_AMOUNT_KOBO` — exact annual plan amount in kobo, matching the Paystack plan.
- `PAYSTACK_CALLBACK_URL` — optional; defaults to the current app origin plus `/billing/return`.

Configure the webhook URL in Paystack as:

`https://dailymanager-neon.vercel.app/api/billing/webhook`

Use the same secret key environment as the Paystack dashboard environment where the plan codes were created. Test keys and test plan codes belong only in Preview/Development; live keys and live plan codes belong only in Production.

## Checkout and verification

- `POST /api/billing/initialize` — authenticated workspace owner only; accepts `monthly` or `annual`.
- `POST /api/billing/verify` — verifies the returned reference directly with Paystack before activating a subscription.
- `POST /api/billing/webhook` — validates Paystack's HMAC SHA-512 signature and records each event idempotently.
- `GET /api/billing/status` — owner-only billing status and recent payments.
- `GET /api/workspace/export` — owner-only JSON export of workspace records.

No prices or plan codes are embedded in source. Checkout remains unavailable until all required environment variables and matching Paystack plans are configured. Never test with a live charge unless the owner has explicitly approved it.
