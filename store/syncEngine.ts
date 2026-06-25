import NetInfo from '@react-native-community/netinfo';

import { createTransaction } from '@/services/user';

import { store$ } from './store';

let syncing = false;

export async function processOutbox() {
  console.log('Checking outbox for pending transactions...', syncing);

  if (syncing) {
    return;
  }

  const network = await NetInfo.fetch();

  if (!network.isConnected) {
    console.log('No internet connection');

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

    console.log(`Found ${pending.length} transactions to sync`);

    for (const [txId, item] of pending) {
      try {
        console.log('Syncing transaction:', txId);

        // Mark syncing
        store$.outbox[txId].status.set('syncing');

        await createTransaction(item.payload);

        // Mark synced instead of deleting
        store$.outbox[txId].assign({
          status: 'synced',

          error: undefined,
        });

        console.log('Transaction synced:', txId);
      } catch (e: any) {
        console.log('Sync failed:', txId, e?.message);

        store$.outbox[txId].assign({
          status: 'failed',

          retryCount: item.retryCount + 1,

          error: e?.message ?? 'Sync failed',
        });
      }
    }
  } finally {
    syncing = false;
  }
}

// Delete yesterday's transactions from outbox to prevent indefinite growth
export function cleanupOutbox() {
  const outbox = store$.outbox.peek();

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  Object.entries(outbox).forEach(([txId, item]) => {
    if (item?.createdAt < cutoff) {
      // Remove the entry by creating a shallow copy without the key
      const outboxCopy = { ...store$.outbox.peek() } as Record<string, unknown>;
      delete outboxCopy[txId];
      store$.outbox.set(outboxCopy as any);
      console.log('Deleted old transaction from outbox:', txId);
    }
  });
}
