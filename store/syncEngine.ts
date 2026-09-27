import NetInfo from '@react-native-community/netinfo';

import { createTransaction } from '@/services/user';
import { OutboxItem } from '@/types/user';
import { getErrorMessage } from '@/utils/errors';
import { showSnackbar } from '@/utils/snackbar';

import { buildSyncFailure, canAutoRetry, shouldRemoveOutboxItem } from './outboxPolicy';
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

      store$.outbox[txId].assign(failure);

      if (notifyOnFailure) {
        showSnackbar(`Transaction sync failed: ${message}`, { type: 'error' });
      }
    }
  }
}

export async function processOutbox() {
  if (!beginOutboxSync()) {
    return;
  }

  try {
    do {
      await runOutboxPass();
    } while (takeOutboxRerun());
  } finally {
    endOutboxSync();
  }
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
