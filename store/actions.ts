import { fetchCustomers } from '@/services/user';
import { store$ } from './store';

import { Customer, OutboxItem, TransactionPayload } from '@/types/user';
import { processOutbox } from './syncEngine';

export const actions = {
  async syncCustomers(agentCode: number, bankCode: string) {
    if (store$.isRefreshingCustomers.peek()) {
      return;
    }

    store$.isRefreshingCustomers.set(true);

    try {
      const customers = await fetchCustomers({
        agentCode,
        bankCode,
      });
      console.log('Fetched customers:', customers);

      const mapped = customers.reduce(
        (acc, customer) => {
          acc[customer.accountNumber] = customer;

          return acc;
        },
        {} as Record<number, Customer>,
      );

      store$.customers.set(mapped);

      store$.lastCustomerSync.set(Date.now());
    } catch (e) {
      console.error('Failed to sync customers', e);
      console.log('Offline mode active');
    } finally {
      store$.isRefreshingCustomers.set(false);
    }
  },

  addTransaction(payload: TransactionPayload) {
    const transaction: OutboxItem = {
      payload,

      status: 'pending',

      retryCount: 0,

      createdAt: Date.now(),
    };

    store$.outbox[payload.transactionId].set(transaction);

    console.log('Transaction added:', payload.transactionId);

    // Trigger immediate sync attempt
    processOutbox();
  },

  retryFailedTransactions() {
    const outbox = store$.outbox.peek();

    Object.keys(outbox).forEach((txId) => {
      if (outbox[txId].status === 'failed') {
        store$.outbox[txId].status.set('pending');
      }
    });
  },
};
