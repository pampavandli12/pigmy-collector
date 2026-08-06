import { fetchCustomers } from '@/services/user';
import { getActiveAgentId, store$ } from './store';
import { getAgentAccountId } from '@/services/authStorage';

import { Customer, OutboxItem, TransactionPayload } from '@/types/user';
import { showSnackbar } from '@/utils/snackbar';
import { cleanupOutbox, processOutbox } from './syncEngine';

function isToday(timestamp: number) {
  const today = new Date();
  const date = new Date(timestamp);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function updateCustomerBalanceForToday(
  payload: TransactionPayload,
  createdAt: number,
) {
  if (!isToday(createdAt)) {
    return;
  }

  const customer$ = store$.customers[payload.accountNumber];
  const customer = customer$.peek();

  if (!customer) {
    return;
  }

  customer$.currentBalance.set(
    Number(customer.currentBalance || 0) + Number(payload.collectedAmount || 0),
  );
}

function getTodaysTransactionTotalsByAccount() {
  const outbox = store$.outbox.peek();

  return Object.values(outbox).reduce(
    (acc, item) => {
      if (!item || !isToday(item.createdAt)) {
        return acc;
      }

      const accountNumber = item.payload.accountNumber;

      acc[accountNumber] =
        Number(acc[accountNumber] || 0) +
        Number(item.payload.collectedAmount || 0);

      return acc;
    },
    {} as Record<number, number>,
  );
}

function mergeFetchedCustomersWithLocalBalances(customers: Customer[]) {
  const existingCustomers = store$.customers.peek();
  const todaysTransactionTotals = getTodaysTransactionTotalsByAccount();

  return customers.reduce(
    (acc, customer) => {
      const existingCustomer = existingCustomers[customer.accountNumber];
      const fetchedBalance = Number(customer.currentBalance || 0);
      const localTransactionTotal =
        todaysTransactionTotals[customer.accountNumber] || 0;
      const localBalance =
        existingCustomer?.currentBalance ?? fetchedBalance + localTransactionTotal;

      acc[customer.accountNumber] = {
        ...customer,
        currentBalance: localTransactionTotal
          ? Math.max(fetchedBalance, Number(localBalance || 0))
          : customer.currentBalance,
      };

      return acc;
    },
    {} as Record<number, Customer>,
  );
}

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
      const mapped = mergeFetchedCustomersWithLocalBalances(customers);

      store$.customers.set(mapped);

      store$.lastCustomerSync.set(Date.now());
    } catch {
      showSnackbar('Unable to refresh customers. Showing offline data.', {
        type: 'error',
      });
    } finally {
      store$.isRefreshingCustomers.set(false);
    }
  },

  addTransaction(payload: TransactionPayload) {
    if (
      getActiveAgentId() !== null &&
      getActiveAgentId() !==
      getAgentAccountId({ agentCode: payload.agentCode, bankCode: payload.bankCode })
    ) {
      showSnackbar('The active agent changed. Please reopen the customer.', {
        type: 'error',
      });
      return false;
    }

    const existingTransaction = store$.outbox[payload.transactionId].peek();

    if (existingTransaction) {
      return false;
    }

    const createdAt = Date.now();

    const transaction: OutboxItem = {
      payload,

      status: 'pending',

      retryCount: 0,

      createdAt,
    };

    store$.outbox[payload.transactionId].set(transaction);
    updateCustomerBalanceForToday(payload, createdAt);

    // Trigger immediate sync attempt
    processOutbox();
    // Remove only malformed persisted records; valid transactions are retained.
    cleanupOutbox();
    return true;
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
