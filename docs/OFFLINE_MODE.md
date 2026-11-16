# DailyManager offline mode

DailyManager uses the device's IndexedDB database for an offline copy of the most recently synced workspace. Neon Postgres remains the shared source of truth for all workspaces and team members.

## Current implementation scope

- A PWA manifest and service worker provide an installable app shell and cache same-origin static assets.
- The most recently loaded workspace snapshot is stored in IndexedDB on the current browser/device.
- When the app cannot reach the server because the device is offline, it restores that saved snapshot.
- Task status changes made while offline are written to a device outbox and replayed against the authenticated workspace API when connectivity returns.
- The device outbox is scoped to the user and workspace IDs. Pending writes are replayed in creation order.
- The workspace snapshot for the active user/workspace is cleared when the user successfully signs out while online.

## Important limitations

This is the first offline foundation, not yet full offline parity. Creating/editing/deleting tasks, projects and notes, comments, invitations, notifications, billing, and team administration still require a connection. Do not treat a queued task-status change as synced until the app confirms the sync.

The browser's IndexedDB storage is not encrypted by this implementation. Use offline mode only on a device protected by a device passcode and avoid shared/public devices. Browser storage can be cleared by the operating system or browser; it is not a backup. Keep Neon backups and workspace exports.

## Validation before production

1. Install the app on a device and open it online while signed in.
2. Confirm the workspace snapshot is saved by closing/reopening the app.
3. Enable airplane mode and confirm the last synced workspace opens.
4. Change a task status offline; confirm it remains visible as a local pending change.
5. Restore connectivity; confirm the outbox replays and the task status is correct after refresh.
6. Sign out online and confirm the saved active workspace is cleared.
7. Test two accounts and two workspaces on the same device to ensure no cross-account data is shown.
8. Test iOS Safari, Android Chrome, desktop Chrome and Firefox separately.

Do not enable live payment or billing operations while offline. Payments, subscriptions, webhook verification and account security always require a live server connection.
