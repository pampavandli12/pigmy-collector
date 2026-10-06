import NetInfo from '@react-native-community/netinfo';

import { createTransaction } from '@/services/user';
import { OutboxItem } from '@/types/user';
import { getErrorMessage } from '@/utils/errors';
import { showSnackbar } from '@/utils/snackbar';

import { revertCustomerBalanceForFailedTransaction } from './customerBalance';
import {
  buildSyncFailure,
  canAutoRetry,
  MAX_AUTO_RETRIES,
  shouldRemoveOutboxItem,
} from './outboxPolicy';
import { getActiveAgentId, store$, updateAgentOutboxItem } from './store';
import {
  beginOutboxSync,
  endOutboxSync,
  takeOutboxRerun,
} from './syncCoordinator';

function isOffline(network: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}) {
  return network.isConnected !== true || network.isInternetReachable === false;
}

function recoverInterruptedSyncs() {
  const outbox = store$.outbox.peek();

  for (const [txId, item] of Object.entries(outbox)) {
    if (item?.status === 'syncing') {
      store$.outbox[txId].status.set('pending');
    }
  }
}

async function runOutboxPass() {
  // Persisted data can outlive schema changes. Remove unrecoverable entries
  // before they can produce empty transaction requests.
  cleanupOutbox();
  // Reset any item left `syncing` by an app kill / crash mid-request so it can be
  // retried. This runs even when offline (before the network check below), so a
  // relaunch always recovers stuck items rather than leaving them frozen.
  recoverInterruptedSyncs();

  const network = await NetInfo.fetch();

  if (isOffline(network)) {
    return;
  }

  const syncAccountId = getActiveAgentId();
  const outbox = store$.outbox.peek();

  const pending = Object.entries(outbox)
    .filter(([, item]) => {
      return (
        item?.status === 'pending' ||
        (item?.status === 'failed' && canAutoRetry(item))
      );
    })
    .sort((a, b) => a[1].createdAt - b[1].createdAt);

  for (const [txId, item] of pending) {
    if (getActiveAgentId() !== syncAccountId) break;
    const notifyOnFailure = item.status !== 'failed';
    try {
      store$.outbox[txId].status.set('syncing');

      // At-least-once delivery: if this POST reaches the server but the response
      // is lost (timeout/crash), the item is retried with the SAME transactionId.
      // Duplicate protection therefore depends on the backend being idempotent on
      // `transactionId` (see the bank adapters' toRequest). This must be confirmed
      // server-side before production.
      await createTransaction(item.payload);

      if (getActiveAgentId() !== syncAccountId) {
        if (syncAccountId) {
          updateAgentOutboxItem(syncAccountId, txId, {
            status: 'synced',
            error: undefined,
            nextRetryAt: undefined,
            retryHeld: false,
          });
        }
        break;
      }

      store$.outbox[txId].assign({
        status: 'synced',
        error: undefined,
        nextRetryAt: undefined,
        retryHeld: false,
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Sync failed');
      const failure = buildSyncFailure(item, message, error);

      if (getActiveAgentId() !== syncAccountId) {
        if (syncAccountId) {
          updateAgentOutboxItem(syncAccountId, txId, failure);
        }
        break;
      }

      // A permanent failure (4xx rejection / unsupported bank type) will never
      // sync — undo the optimistic balance addition made when it was queued
      // (store/actions.ts), or the customer's shown balance stays inflated by
      // an amount that was never actually collected. Guarded by
      // `balanceReverted` so this can't double-subtract if ever re-processed.
      if (failure.permanent && !item.balanceReverted) {
        revertCustomerBalanceForFailedTransaction(item.payload, item.createdAt);
        failure.balanceReverted = true;
      }

      store$.outbox[txId].assign(failure);

      if (notifyOnFailure) {
        showSnackbar(`Transaction sync failed: ${message}`, { type: 'error' });
      }
    }
  }
}

// A single pending timer that wakes the queue when the soonest backed-off item
// becomes due. Without this, a failed item that is still online would sit `failed`
// forever because nothing re-triggers a drain when `nextRetryAt` elapses.
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleNextRetry() {
  const outbox = store$.outbox.peek();
  let earliest: number | null = null;

  for (const item of Object.values(outbox)) {
    if (!item || item.status !== 'failed' || item.retryHeld) continue;
    if (item.retryCount >= MAX_AUTO_RETRIES) continue;
    if (typeof item.nextRetryAt !== 'number') continue;
    if (earliest === null || item.nextRetryAt < earliest) {
      earliest = item.nextRetryAt;
    }
  }

  clearRetryTimer();
  if (earliest === null) return;

  const delay = Math.max(0, earliest - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processOutbox();
  }, delay);
}

export async function processOutbox() {
  if (!beginOutboxSync()) {
    return;
  }

  try {
    do {
      try {
        await runOutboxPass();
      } catch (error) {
        // A pass-level failure (e.g. NetInfo.fetch rejecting) must not become an
        // unhandled rejection or abort the coordinator bookkeeping.
        console.warn('Outbox sync pass failed:', error);
        break;
      }
    } while (takeOutboxRerun());
  } finally {
    endOutboxSync();
    // Re-arm the retry timer for whatever is still due next.
    scheduleNextRetry();
  }
}

// Stop the retry scheduler (e.g. on account switch / logout) so a stale timer
// cannot fire against a different agent's store.
export function stopOutboxSync() {
  clearRetryTimer();
}

// Persist every valid transaction indefinitely. Cleanup only protects the sync
// loop from malformed records left behind by incompatible persisted schemas.
export function cleanupOutbox() {
  const outbox = store$.outbox.peek();
  const retained = Object.fromEntries(
    Object.entries(outbox).filter(([, item]) => !shouldRemoveOutboxItem(item)),
  ) as Record<string, OutboxItem>;

  if (Object.keys(retained).length !== Object.keys(outbox).length) {
    store$.outbox.set(retained);
  }
}
