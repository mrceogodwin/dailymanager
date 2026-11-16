# DailyManager — verified feature backlog

This is an implementation backlog, not a count of shipped tools. A feature is **Available** only when its UI, database contract, permissions, validation, error handling, and tests are implemented and verified. A navigation label or mock screen does not count as a working feature.

## Existing foundations in the codebase

These are present in code and must be audited and strengthened rather than duplicated:
- Authentication and workspace membership
- Tasks: create, edit, delete, assign, priority, due date, status, list/table and board views
- Projects and task grouping
- Notes
- Task discussions and task activity history
- Workspace invitations and member roles
- Notifications
- Basic overview, calendar/planner, project health and activity views
- Workspace billing routes and platform payment configuration
- Offline snapshots, queued task/project/note mutations, local ID reconciliation and sign-out cleanup
- PWA manifest and service-worker foundation

Presence in code does not automatically mean production-ready. Each item still needs functional and security verification.

## Incomplete work — distinct features only

### Reliability and offline
1. Full offline app-shell and route caching with safe cache versioning.
2. Visible failed-sync details and a deliberate retry action.
3. Idempotent mutation replay so network interruption cannot create duplicate records.
4. Conflict detection when the same record changes on multiple devices.
5. Sync history with timestamps and per-item outcomes.
6. Automated tests for offline create, edit, delete, reconnect, retry and ID reconciliation.
7. Mobile-device acceptance testing for airplane mode, reload, sign-in restoration and reconnect.
8. Accessible keyboard and screen-reader status announcements.
9. Device storage quota handling and recovery from corrupted IndexedDB.
10. Clear local-data retention controls and privacy explanation.

### Task management
11. Task dependencies with blocker/blocked-by relationships and cycle prevention.
12. Subtasks with parent-child progress.
13. Configurable task statuses per workspace.
14. Saved task views with filters, sort order and ownership.
15. Bulk operations with preview, validation and safe confirmation.
16. Task templates with reusable defaults.
17. Recurrence rules with timezone-aware generation and duplicate prevention.
18. Deadline reminders and notification preferences.
19. Task attachments with secure storage and access checks.
20. Task export to CSV with safe formula handling.
21. Task import with preview, field mapping and duplicate detection.
22. Task custom fields with typed validation.
23. Task audit history for meaningful field changes.
24. Task workload and capacity calculations based on real assignments and dates.

### Projects and planning
25. Project milestones with dates, ownership and completion status.
26. Project dependencies and portfolio-level blockers.
27. Project budgets and actual cost tracking.
28. Project health rules based on due dates, overdue work and progress.
29. Gantt timeline with real task dates and dependencies.
30. Resource allocation and workload balancing.
31. Project templates and duplication with safe relationship remapping.
32. Project archive and restore.
33. Calendar export and external calendar synchronization.
34. Timezone-aware scheduling and date display.

### Team collaboration
35. Team directory and profile management.
36. Teammate mentions in task discussions with notification delivery.
37. Discussion editing and deletion with authorization.
38. File attachments in discussions.
39. Read receipts and notification preferences.
40. Workspace role/permission matrix with server-side enforcement.
41. Invitation resend, expiry management and cancellation.
42. Member removal and ownership transfer safeguards.
43. Team availability and leave calendar.
44. Workspace-wide search across permitted tasks, projects and notes.

### Notes and knowledge
45. Rich-text notes with safe rendering.
46. Note folders, tags and pinning.
47. Note search and filtering.
48. Note sharing and access controls.
49. Version history and restore.
50. Export notes to Markdown/PDF.

### Reporting and goals
51. Goals and measurable key results with progress updates.
52. Reports with selectable date ranges and real source data.
53. Project and team workload reports.
54. CSV exports for reports.
55. Scheduled report delivery after notification/email infrastructure is verified.
56. Audit log search and retention controls.

### Workspace administration and billing
57. Workspace profile and preferences.
58. Workspace data export and account deletion workflow.
59. Trial state and entitlement enforcement across server routes.
60. Billing portal and subscription status reconciliation.
61. Verified webhook signature, replay protection and event idempotency.
62. Invoice/receipt history and payment failure recovery.
63. Payment provider credential rotation and encrypted storage verification.
64. Platform-admin audit trail and least-privilege controls.

### Integrations and automation
65. Public API with scoped tokens and revocation.
66. Webhooks with signing, retries and delivery logs.
67. Calendar integration after OAuth and token storage review.
68. Email notifications with delivery tracking and unsubscribe controls.
69. Workflow rules with explicit triggers, conditions and actions.
70. Automation run history, failure handling and pause controls.

## Build order

1. Audit and test the existing implementation before expanding scope.
2. Complete reliability, security and data-integrity foundations.
3. Complete task management workflows.
4. Complete project planning and scheduling.
5. Complete team collaboration and knowledge management.
6. Complete reporting, administration, billing and integrations.
7. Only then publish a verified feature count.

## Release rule

Do not mark a feature Available because a button, card, navigation item, static chart, placeholder or roadmap entry exists. Verify the complete user workflow against Neon, permissions, error paths and automated tests first. Keep unfinished features explicitly labelled Planned or In progress.
