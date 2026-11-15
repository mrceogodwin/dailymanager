# DailyManager Workspace Billing Architecture

Status: approved product direction; implementation plan only until Paystack credentials and pricing are configured.

## Product decisions

- Billing owner: the workspace owner. A subscription belongs to a workspace, not an individual seat.
- Trial: every newly created workspace receives one 7-day trial.
- Payment provider: Paystack.
- Application stack: Next.js App Router on Vercel, PostgreSQL on Neon, using the existing `pg` database layer.
- Existing workspaces and user data must be preserved. No Supabase migration.
- Pricing, plan names, limits, and currency/amounts remain configuration decisions; do not hard-code unapproved prices.
- A workspace can continue using the free tier after its trial or paid period, subject to clearly defined free-tier limits. Do not delete or make existing workspace data inaccessible because of billing.

## Current repository findings

- The application already has `workspaces.plan` and `workspaces.trial_ends_at` columns in its baseline schema.
- Workspace context and the signed-in workspace response already read those fields.
- Registration creates a workspace, but does not currently set a seven-day trial.
- Workspace creation in the workspace API also needs the same trial initialization.
- The dashboard currently has a placeholder upgrade action that says billing is not connected.
- README explicitly identifies subscription checkout, webhook verification, and billing administration as unfinished.
- The existing project uses Next.js 14, React 18, `pg`, and Neon/PostgreSQL. Keep this stack; do not add a second ORM solely for billing.

## Data model

Keep workspace ownership and current workspace identity in `workspaces`. Add a separate billing record rather than overloading the existing `plan` text field.

### `workspace_subscriptions`

One current subscription record per workspace, with history retained where practical:

- `id` UUID or BIGSERIAL primary key (choose a consistent type with the production schema).
- `workspace_id` UUID, unique for the current subscription record and referencing `workspaces(id)`.
- `plan_key` (internal stable key such as `pro_monthly` or `teams_annual`).
- `status`: `trialing`, `active`, `past_due`, `cancel_at_period_end`, `cancelled`, `expired`.
- `trial_started_at`, `trial_ends_at`.
- `current_period_start`, `current_period_end`.
- `cancel_at_period_end`, `cancelled_at`.
- Paystack customer code, subscription code, plan code, and authorization metadata needed for reconciliation. Never store raw card numbers, CVVs, or secret keys.
- `created_at`, `updated_at`.

If historical subscriptions are required, use a partial unique index to allow only one current subscription per workspace rather than deleting old records.

### `billing_payments`

- Workspace and subscription references.
- Unique Paystack transaction reference.
- Amount in minor currency units, currency, status, paid timestamp.
- Paystack transaction ID and safe metadata needed for reconciliation.
- No sensitive card data.

### `billing_webhook_events`

- Unique event identity / transaction reference with event type.
- Payload hash and minimal sanitized payload for audit.
- Received and processed timestamps, processing status, and error summary.
- Unique constraint/idempotency key to prevent duplicate webhook processing.

### `workspace_entitlements` (optional if plan rules are kept in code/config initially)

Use a centralized server-side entitlement map for plan limits and feature flags. Never rely on client-side visibility to enforce paid limits.

## Trial and checkout lifecycle

1. On account registration, create the initial workspace and set `trial_started_at = NOW()`, `trial_ends_at = NOW() + INTERVAL '7 days'`, and trial status in the same database transaction.
2. On every subsequent workspace creation, initialize the same seven-day trial. Switching workspaces must not reset a trial.
3. Trial eligibility is per workspace and cannot be extended by changing the active workspace or re-registering a member. Enforce this server-side.
4. The seven-day trial starts without requiring a card. Show the exact expiry timestamp in the billing screen and send reminders when email delivery is available.
5. During the trial, grant the selected paid-tier trial entitlements. The exact trial tier and plan limits must be approved before launch.
6. Before/at expiry, the owner selects a plan and starts Paystack checkout. The server creates a unique reference and initializes the transaction with the selected Paystack plan code when recurring billing is intended.
7. Only a verified successful payment/webhook can activate the paid entitlement. The browser redirect is informational, never authoritative.
8. Paystack's subscription documentation says a successful initial transaction with a plan code creates the subscription. Store returned identifiers and reconcile them with webhook events.
9. If the workspace does not subscribe, move it to the free tier after trial expiry. Preserve all data; restrict only paid-only actions/limits. Users must still be able to access billing and export their workspace data.
10. Cancellation should normally set `cancel_at_period_end`; access continues until the paid period ends unless a refund, dispute, or security issue requires a separate policy.

## Paystack integration

Server-only environment variables:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY` only if the chosen checkout integration requires it client-side
- `PAYSTACK_WEBHOOK_SECRET` only if distinct from the Paystack secret is used by the chosen verification setup
- `PAYSTACK_PLAN_PRO_MONTHLY`, `PAYSTACK_PLAN_PRO_ANNUAL`, `PAYSTACK_PLAN_TEAMS_MONTHLY`, `PAYSTACK_PLAN_TEAMS_ANNUAL` after approved plans are created in Paystack
- `APP_URL` for trusted callback URLs

Never expose the secret key through a `NEXT_PUBLIC_` variable or client bundle.

Suggested API routes:

- `POST /api/billing/checkout`: authenticated workspace owner only; validates plan key against server configuration, creates a random reference, initializes Paystack transaction, and returns the hosted authorization URL.
- `GET /api/billing/verify?reference=...`: verifies a transaction with Paystack server-to-server and reconciles the payment. This supplements, not replaces, webhook processing.
- `POST /api/billing/webhook`: verifies the Paystack signature using HMAC SHA-512 and constant-time comparison; persists event idempotently; processes only supported event types.
- `GET /api/billing/status`: returns sanitized subscription state and entitlements for the active workspace.
- `POST /api/billing/cancel`: owner-only cancellation/non-renewal flow.
- `POST /api/billing/portal` (if supported/needed): generates a Paystack subscription management link for card updates/cancellation.

Handle at minimum `charge.success`, `invoice.payment_failed`, `invoice.update`, `subscription.create`, `subscription.not_renew`, and `subscription.disable`. Reconcile events against the transaction/subscription API when event order or payload completeness is uncertain.

Paystack documents that subscription charges are not automatically retried after a failed charge. DailyManager must implement its own recovery flow: mark the workspace `past_due`, notify the owner, provide a retry/update-payment action, and apply a clearly communicated grace period before reverting to free-tier entitlements. Do not silently mark a failed payment as paid.

## Authorization and entitlement enforcement

- Only the workspace owner can view/manage billing or change the plan.
- Admins and members can use the workspace according to role and subscription entitlements but cannot change payment details.
- All paid feature checks run on the server in API handlers, not only in the UI.
- Resolve the active workspace from the authenticated session and membership; never trust a workspace ID supplied by the browser without membership verification.
- Every checkout reference is unique and bound to exactly one workspace, plan, amount, currency, and initiating owner.
- Verify amount, currency, reference, transaction status, and plan mapping before recording payment.
- Make webhook handling idempotent and safe for retries/out-of-order delivery.
- Log billing state changes without logging secrets or payment credentials.

## Workspace data export

Data export is separate from subscription access:

- Basic workspace export remains available on the free tier.
- Owner/admin authorization is required for a full workspace export; individual members may export only their own personal data if that feature is added.
- Provide JSON for structured backup and CSV for spreadsheet use; ZIP can package a multi-file export.
- Export only records belonging to the authorized workspace.
- Exclude password hashes, session tokens, invitation tokens, payment secrets, and sensitive provider credentials.
- Generate exports server-side, with size/rate limits and audit records. Consider signed, short-lived download URLs if exports are stored temporarily.

## Implementation phases and acceptance checks

### Phase 0 — Preflight
- Confirm the production Neon project/branch/database and snapshot before schema changes.
- Inspect actual production column types and constraints; the repository baseline schema has BIGINT IDs, while the inspected production workspace IDs were UUIDs. New foreign keys must match the real production types.
- Confirm the intended Paystack business account, test/live mode, currency, approved prices, plan codes, and callback/webhook URLs.
- Do not deploy live billing until test-mode end-to-end checks pass.

### Phase 1 — Schema and trial initialization
- Add versioned migration(s) for subscription, payment, and webhook-event records using production-compatible ID types.
- Backfill existing workspaces conservatively: do not grant a fresh trial to old workspaces automatically; preserve their current plan and data.
- Set a seven-day trial atomically for newly registered workspaces and newly created workspaces.
- Verify trial timestamps and uniqueness constraints.

### Phase 2 — Paystack checkout and verification
- Implement owner-only checkout and server-side transaction verification.
- Store transaction references before redirecting to Paystack.
- Confirm successful, failed, abandoned, duplicated, and mismatched-amount cases in test mode.
- Ensure only a verified charge activates paid entitlements.

### Phase 3 — Webhooks and subscription lifecycle
- Implement signature validation, durable event storage, idempotency, reconciliation, cancellation, payment failure, and renewal handling.
- Test duplicate and out-of-order webhook deliveries.
- Implement a configurable grace period and recovery UX because Paystack does not retry failed subscription charges automatically.

### Phase 4 — Billing UI and enforcement
- Replace the current placeholder upgrade button with a real plan selection and checkout flow.
- Add owner-only billing settings, trial countdown, next payment date, payment history, renewal/cancellation status.
- Enforce entitlements server-side across every paid endpoint.
- Ensure workspace switching never changes another workspace's billing state.

### Phase 5 — Export and release
- Implement workspace JSON/CSV export with authorization and audit logging.
- Run end-to-end tests on a staging/test deployment and Neon branch.
- Verify production environment variables, Paystack live plan codes, webhook endpoint, TLS, and Vercel deployment.
- Launch billing only after all acceptance checks pass.

## Release blockers

Do not launch paid subscriptions until:
- Paystack test-mode checkout and webhook verification pass.
- Duplicate webhook deliveries cannot duplicate payments or extend periods twice.
- A client-side redirect cannot unlock paid features without server verification.
- Workspace owner authorization is tested.
- Trial expiry and free-tier fallback preserve workspace data.
- Failed payment and cancellation behavior is tested and clearly shown to users.
- Live Paystack credentials and plan codes are configured in the correct Vercel project.
