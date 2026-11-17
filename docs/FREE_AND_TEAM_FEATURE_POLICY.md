# DailyManager Free and Team feature policy

Status: implementation guardrail for the current release. This document is not a pricing approval and does not activate paid feature gates.

## Principles

1. Keep existing workspace data accessible when a trial or paid period ends.
2. Do not gate the current core workspace features until plan limits and pricing are explicitly approved.
3. Enforce any future limits in server-side API handlers. Hiding a button in the browser is not access control.
4. Keep billing, account recovery, and workspace data export available to the workspace owner even when the workspace is on Free.
5. Never reset a workspace trial by switching workspaces or adding another member.
6. Treat a subscription as belonging to a workspace, not to an individual user.

## Current feature inventory

| Area | Current repository state | Release policy |
|---|---|---|
| Tasks and work intake | Available: create, edit, filter, prioritize, complete, and assign tasks | Keep available on Free |
| Projects and portfolio | Available: create projects, group tasks, review progress | Keep available on Free |
| Planning and scheduling | Planner, calendar, and due-date workflows exist; some planning capabilities remain in progress | Keep existing functionality available |
| Docs and knowledge | Workspace notes are available; shared knowledge articles are planned | Keep notes available |
| Collaboration | Workspace membership, roles, invitations, task comments, notifications, and activity are implemented | Keep existing collaboration available until approved member/seat limits exist |
| Goals and insights | Basic completion insights exist; full linked OKRs are planned | Keep current insights available |
| Team performance | Workload and completion views exist using current task/member data | Keep current views available |
| Reports and exports | Project task CSV and owner-only workspace JSON export exist | Keep existing exports available |
| Billing | Trial, checkout foundations, payment history, provider management, and subscription lifecycle handlers exist | Owner-only; billing and plan changes are not a paid feature |
| Automation, AI, CRM, HR, finance, support, integrations, and advanced workflow packs | Mostly planned, not complete | Do not advertise as available or apply paid gates yet |

## Proposed future differentiation (not yet activated)

Team may later include higher limits and advanced capabilities such as automation, expanded reporting, additional workflow packs, and larger collaboration capacity. The actual limits, feature names, pricing, grace periods, and grandfathering rules require product approval before implementation.

Do not assume a specific number of users, projects, tasks, storage quota, or automation runs. Do not hard-code prices or currency amounts from this document.

## Required acceptance checks before enabling a paid gate

- The same entitlement decision is enforced in every relevant API route and background operation.
- The UI explains the limit and offers a clear upgrade path without deleting or hiding existing records.
- Downgrade behavior is non-destructive and preserves read/export access.
- Workspace switching cannot transfer entitlements between workspaces.
- Owners can still access billing, payment history, and data export on Free.
- Tests cover Free, active Team, trialing, past-due, non-renewing, cancelled, and expired states.
- Plan configuration is server-controlled; no client-submitted plan or workspace identifier is trusted without authorization.

## Current release decision

Until product limits and pricing are approved, all currently implemented core workspace features remain available regardless of Free/Team billing status. Subscription state is tracked and displayed, but this document does not authorize restricting existing functionality.
