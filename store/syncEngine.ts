import NetInfo from '@react-native-community/netinfo';

import { createTransaction } from '@/services/user';
import { OutboxItem } from '@/types/user';
import { getErrorMessage } from '@/utils/errors';
import { showSnackbar } from '@/utils/snackbar';

import { shouldRemoveOutboxItem } from './outboxPolicy';
import { store$ } from './store';

let syncing = false;

export async function processOutbox() {
  if (syncing) {
    return;
  }

  const network = await NetInfo.fetch();

  if (network.isConnected !== true) {
    return;
  }

  syncing = true;

  try {
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
      try {
        // Mark syncing
        store$.outbox[txId].status.set('syncing');

        await createTransaction(item.payload);

        // Mark synced instead of deleting
        store$.outbox[txId].assign({
          status: 'synced',

          error: undefined,
        });

      } catch (error: unknown) {
        const message = getErrorMessage(error, 'Sync failed');

        store$.outbox[txId].assign({
          status: 'failed',

          retryCount: item.retryCount + 1,

          error: message,
        });

        showSnackbar(`Transaction sync failed: ${message}`, { type: 'error' });
      }
    }
  } finally {
    syncing = false;
  }
}

// The business retention policy removes every outbox item from previous
// calendar days, regardless of its sync status.
export function cleanupOutbox() {
  const outbox = store$.outbox.peek();
  const retained = Object.fromEntries(
    Object.entries(outbox).filter(([, item]) => !shouldRemoveOutboxItem(item)),
  ) as Record<string, OutboxItem>;

  if (Object.keys(retained).length !== Object.keys(outbox).length) {
    store$.outbox.set(retained);
  }
}
