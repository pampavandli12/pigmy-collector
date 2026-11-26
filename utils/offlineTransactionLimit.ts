/**
 * Enforces the agent's cap on outstanding unsynced deposits (from the login
 * response). Unlike collectionLimit/gracePeriod, `0` is a real, enforceable
 * value here — it means no deposit may be queued while offline — only a
 * missing/invalid limit fails open. Used by `app/userDetail.tsx`.
 *
 * Every deposit is written to the outbox before it syncs, so when the device
 * is online the new deposit is expected to sync immediately and does not count
 * against the cap; only the existing unsynced backlog does. When offline (or
 * connectivity is unknown) the new deposit counts too.
 */
export const OFFLINE_TRANSACTION_LIMIT_EXCEEDED_MESSAGE =
  'Offline deposit limit reached. Please sync your pending deposits before adding another.';

export interface OfflineTransactionLimitResult {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
}

export function evaluateOfflineTransactionLimit(
  offlineTransactionLimit: number | null | undefined,
  pendingOutboxCount: number,
  additionalCount = 0,
  isOnline = false,
): OfflineTransactionLimitResult {
  if (
    offlineTransactionLimit === null ||
    offlineTransactionLimit === undefined ||
    !Number.isInteger(offlineTransactionLimit) ||
    offlineTransactionLimit < 0
  ) {
    return { allowed: true, remaining: null, limit: null };
  }

  const pending = Number(pendingOutboxCount || 0);
  const additional = Number(additionalCount || 0);
  const remaining = Math.max(0, offlineTransactionLimit - pending);
  // Offline: the deposit being added (at least one) will sit in the outbox.
  // Online: it should sync right away, so only the existing backlog counts.
  const counted = isOnline ? 0 : Math.max(1, additional);
  const allowed = pending + counted <= offlineTransactionLimit;

  return { allowed, remaining, limit: offlineTransactionLimit };
}
