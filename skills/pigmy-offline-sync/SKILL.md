---
name: pigmy-offline-sync
description: Work with Pigmy Collector offline-first transaction sync, local outbox behavior, customer refresh, MMKV persistence, NetInfo reconnect handling, or changes touching store/actions.ts, store/store.ts, store/syncEngine.ts, and store/selectors.ts.
---

# Pigmy Offline Sync

## Files To Inspect

- `store/store.ts`: Legend State shape and MMKV persistence hooks for `customers` and `outbox`.
- `store/actions.ts`: customer sync, transaction enqueueing, failed retry reset.
- `store/syncEngine.ts`: network check, outbox processing, retry status, cleanup.
- `store/selectors.ts`: dashboard/customer read models.
- `app/(tabs)/_layout.tsx`: NetInfo listener that retries sync on reconnect.
- `types/user.ts`: `TransactionPayload`, `OutboxItem`, `SyncStatus`.

## Working Rules

Use `actions.addTransaction` as the single entry point for locally captured deposits. Preserve optimistic behavior: a transaction should appear in today’s dashboard data before remote sync completes.

Keep outbox items keyed by `transactionId`. Respect the status lifecycle: `pending` -> `syncing` -> `synced` or `failed`. `processOutbox` should remain guarded against concurrent runs and should avoid network calls when offline.

## Persistence Notes

The active local persistence is Legend State plus MMKV. `expo-sqlite`, `DB_NAME`, and `TABLE_NAME` exist, but no SQLite schema/query layer is active. If adding SQLite, make it an explicit migration/design change rather than silently mixing persistence models.

## Verification

After changes, verify: create a deposit offline, confirm it appears locally, reconnect, confirm sync retry runs, and confirm failed items can retry without duplicate submissions.
