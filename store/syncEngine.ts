import NetInfo from '@react-native-community/netinfo';

import { createTransaction } from '@/services/user';
import { OutboxItem } from '@/types/user';
import { getErrorMessage } from '@/utils/errors';
import { showSnackbar } from '@/utils/snackbar';

import { shouldRemoveOutboxItem } from './outboxPolicy';
import { getActiveAgentId, store$, updateAgentOutboxItem } from './store';
import { beginOutboxSync, endOutboxSync } from './syncCoordinator';

export async function processOutbox() {
  if (!beginOutboxSync()) {
    return;
  }

  // Persisted data can outlive schema changes. Remove unrecoverable entries
  // before they can produce empty transaction requests.
  cleanupOutbox();

  const network = await NetInfo.fetch();

  if (network.isConnected !== true) {
    endOutboxSync();
    return;
  }

  try {
    const syncAccountId = getActiveAgentId();
    const outbox = store$.outbox.peek();

    const pending = Object.entries(outbox)
      .filter(([_, item]) => {
        return (
          (item && item.status === 'pending') ||
          (item && item.status === 'failed')
        );
      })
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    for (const [txId, item] of pending) {
      if (getActiveAgentId() !== syncAccountId) break;
      try {
        // Mark syncing
        store$.outbox[txId].status.set('syncing');

        await createTransaction(item.payload);

        if (getActiveAgentId() !== syncAccountId) {
          if (syncAccountId) {
            updateAgentOutboxItem(syncAccountId, txId, {
              status: 'synced',
              error: undefined,
            });
          }
          break;
        }

        // Mark synced instead of deleting
        store$.outbox[txId].assign({
          status: 'synced',

          error: undefined,
        });
      } catch (error: unknown) {
        const message = getErrorMessage(error, 'Sync failed');

        if (getActiveAgentId() !== syncAccountId) {
          if (syncAccountId) {
            updateAgentOutboxItem(syncAccountId, txId, {
              status: 'failed',
              retryCount: item.retryCount + 1,
              error: message,
            });
          }
          break;
        }

        store$.outbox[txId].assign({
          status: 'failed',

          retryCount: item.retryCount + 1,

          error: message,
        });

        showSnackbar(`Transaction sync failed: ${message}`, { type: 'error' });
      }
    }
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
