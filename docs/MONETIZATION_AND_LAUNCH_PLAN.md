# DailyManager Monetization and Launch Plan

Status: approved product direction; implementation and commercial details remain gated.
Decision: launch for both individuals and teams, with monthly subscriptions as the primary and only initial billing cadence.
Branch: development
Database: Neon PostgreSQL only
Deployment target: existing Vercel project

## 1. Commercial positioning

DailyManager is a practical workspace for people and teams to plan work, manage tasks and projects, collaborate, and understand progress.

Launch audiences:
- Individuals: freelancers, professionals, founders, students, and people managing their own work.
- Teams: small businesses, agencies, startups, and operational teams that need shared ownership, assignments, and visibility.

Core promise: keep personal work and team work organised in one dependable workspace.

Do not market planned modules as available. Automation, AI, CRM, HR, finance, support, advanced integrations, and other incomplete workflow packs must remain labelled as planned or hidden until implemented and tested.

## 2. Initial packaging

The product should have three customer-facing packages. Exact feature limits and final prices are not yet approved.

### Free
Purpose: acquisition, habit formation, and product-led referrals.
- A useful personal workspace.
- Core tasks, projects, notes, and basic planning that are already implemented.
- Basic account and workspace data export.
- Clear upgrade prompts only when a real, approved limit is reached.

Do not remove, hide, or make existing user data inaccessible when a trial or paid period ends.

### Pro (individual)
Purpose: monetize individuals whose personal workflow grows beyond the free package.
Pro differentiation should be based on genuinely delivered value, such as higher approved usage limits, richer personal reporting, more advanced planning, and premium capabilities once built.
Do not advertise a Pro feature until it exists and has an acceptance test.

### Team (workspace subscription)
Purpose: monetize businesses and groups.
Team differentiation may include paid seat capacity, team administration, richer workload and performance reporting, and advanced collaboration/workflow capabilities that are actually implemented.
The subscription belongs to the workspace, not an individual user. A personal workspace can buy Pro; a shared workspace can buy Team.
Before selling per-seat Team pricing, implement and test seat quantity calculation, seat changes, proration/refund policy, and server-side seat enforcement. Do not charge per seat while the product cannot reliably count and enforce billable seats.

### Later: Business / Enterprise
Not part of the initial self-serve launch. Consider custom annual contracts, onboarding, support commitments, and integrations only after repeatable demand is demonstrated. The initial billing cadence remains monthly; annual billing is deferred until explicitly approved.

## 3. Pricing hypothesis and validation

The following are research hypotheses, not approved production prices:
- Pro: test willingness to pay around NGN 3,500–5,000 per workspace/month.
- Team: test willingness to pay around NGN 2,500–4,000 per billable seat/month.

Do not hard-code these ranges. Before enabling checkout:
1. Interview at least 10 target individuals and 10 team buyers.
2. Show a simple pricing page or clickable pricing concept.
3. Ask what they currently use, what problem costs them time/money, and what they would pay monthly.
4. Secure at least 5 credible pilot commitments (ideally 2–3 paid pilots) before finalizing the launch price.
5. Approve exact prices, currency, taxes/fees, trial terms, seat definition, cancellation policy, and refund policy in writing.
6. Store prices and plan limits in server-controlled configuration/database, not in client-side constants.

Do not assume NGN is the only market currency. Start with NGN checkout for Nigerian customers. Offer USD checkout to international customers only after the provider, currency, settlement, tax, and refund path have been verified. Currency availability must be based on actual provider support and account configuration.

## 4. Billing model and payment operations

Initial cadence: monthly subscriptions only.

Preferred payment routing:
- Paystack: primary NGN checkout for Nigerian customers.
- Bachs: optional USD route for international customers, only after full end-to-end verification.
- Keep payment-provider secrets encrypted/server-side. Never expose secret keys in browser code, public environment variables, logs, or support messages.

Required lifecycle:
1. Authenticated workspace owner selects a plan and monthly price.
2. Server reads authoritative plan/price/provider configuration.
3. Server creates checkout with a unique internal reference and exact amount/currency.
4. Customer completes hosted checkout.
5. Server verifies signed webhook and reconciles provider transaction, reference, amount, currency, plan, workspace, and subscription identity.
6. Entitlement changes only after verified payment.
7. Duplicate webhooks are idempotent.
8. Failed payments, cancellation, non-renewal, renewal, and expiry update subscription state correctly.
9. Customer can manage/cancel subscription and view payment history.
10. Cancellation is effective at the paid-through date unless provider terms or law require otherwise.

Never grant paid access based only on a browser redirect. Never trust plan, amount, currency, workspace ID, or seat count supplied by the client without server-side validation.

Existing repository code contains billing and subscription lifecycle foundations, but production payment readiness is NOT established until real provider test transactions and webhook deliveries pass. Verify current route implementation before making any launch claim.

## 5. Entitlements and downgrade rules

The current feature policy keeps existing core features available until exact limits and prices are approved. The launch market and monthly cadence are now approved; that does not approve exact limits or activate paywalls.

Before gating a feature:
- Publish exact Free/Pro/Team limits and reset periods.
- Enforce every limit in server-side API routes, not just the UI.
- Cover create, update, import, invitation, background, and offline-sync paths.
- Make upgrade messaging explain the limit and price.
- Prevent workspace switching or role changes from bypassing entitlement checks.
- Preserve read access, billing access, and data export after downgrade.
- Never delete data or silently unassign people when a subscription expires.
- Define a grace period and failed-payment recovery policy.
- Test Free, trial, active, past-due, non-renewing, cancelled, and expired states.

Do not introduce a paid gate solely to make a tier appear different. Paid differentiation must correspond to a real, reliable benefit.

## 6. Trial and conversion

The current registration implementation creates a seven-day trial state. Keep the existing duration until a deliberate product decision changes it.

Trial requirements:
- Explain trial length and what happens at its end before signup.
- Do not require a payment method unless the exact consent and cancellation journey is implemented.
- Send clear reminders before expiry once transactional email is available.
- At expiry, move the workspace to Free without deleting or hiding existing data.
- Provide an upgrade path and an export path.
- Do not restart a trial through workspace switching, new membership, or repeated signup.

## 7. Go-to-market

### First cohort: design partners
Recruit 10–20 users across both segments:
- 5–10 individuals (freelancers, consultants, founders, professionals).
- 5–10 small teams (agencies, startups, service businesses, operations teams).

Run a guided onboarding and weekly feedback loop. Do not optimize for a large signup count before activation and retention are understood.

### Acquisition channels
- Founder-led demos and direct outreach to Nigerian freelancers and small businesses.
- LinkedIn content showing real task/project/team workflows.
- Short product walkthrough videos and practical templates.
- Referrals from existing users and business communities.
- Partnerships with agencies, consultants, and startup communities.

### Activation
Measure whether a new account:
- Creates or imports a first task.
- Creates a project or planning workflow.
- Returns on a second day.
For teams, measure whether an owner invites a teammate and assigns work.

Build onboarding around reaching this first meaningful outcome, not around showing every menu item.

### Conversion
- Let users experience the core value before prompting to upgrade.
- Show the exact feature/limit, price, billing cadence, and next charge before checkout.
- Keep checkout short and mobile-friendly.
- Follow up with helpful onboarding, not spam.
- Record checkout started, payment succeeded, payment failed, cancelled, and renewal events.

## 8. Metrics and revenue model

Track weekly:
- New registrations by segment and source.
- Activation rate (first meaningful task/project action).
- Day-7 and day-30 retention.
- Individual-to-Pro conversion.
- Free-to-Team conversion.
- Active paid workspaces and paid seats.
- Monthly recurring revenue (MRR).
- Average revenue per paid workspace and per paid seat.
- Payment success and involuntary churn.
- Cancellation and logo/seat churn.
- Support tickets and time to resolution.

Revenue arithmetic:
- Pro MRR = active Pro workspaces × monthly Pro price.
- Team MRR = active billable Team seats × monthly seat price (or the approved workspace fee if not seat-based).
- Total MRR = Pro MRR + Team MRR.
- Net revenue must subtract provider fees, refunds, taxes, chargebacks, and applicable operating costs.

Do not report trial workspaces, failed payments, or free workspaces as paid MRR.

## 9. Launch acceptance gates

A public paid launch is blocked until all applicable gates pass.

### Product and UX
- Pricing page matches the actual server-side plans and limits.
- Free, Pro, and Team descriptions are accurate.
- Mobile signup, onboarding, workspace switching, upgrade, cancellation, and billing screens work.
- No placeholder or unfinished feature is sold.
- Terms, privacy policy, support contact, cancellation and refund policy are published.

### Account and security
- Email verification and password reset are implemented and tested.
- Session lifecycle, logout/revocation, rate limits, and authorization are tested.
- Workspace isolation and role permissions pass cross-account tests.
- Security headers, CSRF/origin protection, input validation, and abuse controls are reviewed.

### Billing
- Exact prices and currency are approved.
- Provider account is live and correctly configured.
- Test checkout and successful payment verified.
- Invalid signature, wrong amount/currency, unknown reference, duplicate webhook, delayed webhook, failed payment, renewal, cancellation, and expiry tested.
- Payment history and subscription management work.
- Refund and support process is operational.
- Paid entitlement is never client-controlled.

### Data and reliability
- Neon production database identity is confirmed; no accidental preview/prod crossover.
- Schema migrations are reviewed, backed up, and applied only with explicit production approval.
- Workspace export and device backup tested.
- Restore is not advertised as available until transactional restore is implemented and tested.
- Offline queue retries, duplicate prevention, ordering, and conflict handling are tested.
- Monitoring, error alerts, database backup and recovery procedure exist.

### Deployment
- Correct DailyManager Vercel project is confirmed.
- Production environment variables are verified without exposing secrets.
- Development CI passes.
- Approved commit is merged to main only after review.
- Production deployment is confirmed READY and mapped to the intended domain.
- Smoke tests run against production after deployment.
- Rollback procedure is documented.

## 10. Release sequence

1. Complete security, recovery, and data integrity work.
2. Confirm the correct Vercel production project and Neon database.
3. Approve exact plan limits, prices, seat definition, and policies.
4. Complete and test checkout/webhooks in provider test mode.
5. Run a closed pilot with 10–20 users; do not collect live subscriptions until billing acceptance passes.
6. Fix pilot issues and verify retention/activation.
7. Approve production release, merge the reviewed development branch, deploy, and smoke-test.
8. Enable paid checkout for a small cohort.
9. Monitor payment reconciliation, support load, churn, and reliability daily for the first month.

## 11. Explicitly not approved yet

- Exact production prices.
- Exact Free/Pro/Team limits.
- Per-seat billing mechanics and proration rules.
- Annual billing.
- USD pricing and international tax treatment.
- Enterprise contracts and service-level commitments.
- Paid gates on current core features.
- Live production checkout activation.
- Production database migrations or deployment approval.

These decisions require explicit approval and implementation verification before they become customer-facing commitments.
