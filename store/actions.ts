import { getAgentAccountId } from '@/services/authStorage';
import { isRegisteredBankType } from '@/services/banks/registry';
import { fetchCustomers } from '@/services/user';
import { getActiveAgentId, store$ } from './store';

import { Customer, OutboxItem, SyncableTransactionPayload, transactionPayloadSchema } from '@/types/user';
import { isToday } from '@/utils/isToday';
import { showSnackbar } from '@/utils/snackbar';
import { cleanupOutbox, processOutbox } from './syncEngine';

function updateCustomerBalanceForToday(
  payload: SyncableTransactionPayload,
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

function getTodaysUnsyncedTotalsByAccount() {
  const outbox = store$.outbox.peek();

  return Object.values(outbox).reduce(
    (acc, item) => {
      if (!item || item.status === 'synced' || !isToday(item.createdAt)) {
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
  const todaysUnsyncedTotals = getTodaysUnsyncedTotalsByAccount();

  return customers.reduce(
    (acc, customer) => {
      const fetchedBalance = Number(customer.currentBalance || 0);
      const unsyncedTotal = todaysUnsyncedTotals[customer.accountNumber] || 0;

      acc[customer.accountNumber] = {
        ...customer,
        currentBalance: fetchedBalance + unsyncedTotal,
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
    } catch (error) {
      console.warn('Failed to refresh customers:', error);
      showSnackbar('Unable to refresh customers. Showing offline data.', {
        type: 'error',
      });
    } finally {
      store$.isRefreshingCustomers.set(false);
    }
  },

  addTransaction(payload: unknown) {
    const parsed = transactionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return false;
    }
    const validPayload = parsed.data;

    if (!isRegisteredBankType(validPayload.bankType)) {
      return false;
    }

    if (
      getActiveAgentId() !== null &&
      getActiveAgentId() !==
      getAgentAccountId({ agentCode: validPayload.agentCode, bankCode: validPayload.bankCode })
    ) {
      showSnackbar('The active agent changed. Please reopen the customer.', {
        type: 'error',
      });
      return false;
    }

    const existingTransaction = store$.outbox[validPayload.transactionId].peek();

    if (existingTransaction) {
      return false;
    }

    const createdAt = Date.now();

    const transaction: OutboxItem = {
      payload: validPayload,

      status: 'pending',

      retryCount: 0,

      createdAt,
    };

    store$.outbox[validPayload.transactionId].set(transaction);
    updateCustomerBalanceForToday(validPayload, createdAt);

    // Trigger immediate sync attempt
    processOutbox();
    // Remove only malformed persisted records; valid transactions are retained.
    cleanupOutbox();
    return true;
  },

  retryFailedTransactions() {
    const outbox = store$.outbox.peek();
    let reset = 0;

    Object.keys(outbox).forEach((txId) => {
      const item = outbox[txId];
      // Skip permanent rejections (4xx / unsupported bank type): they will only
      // immediately re-fail. Only revive transient failures.
      if (item?.status === 'failed' && !item.permanent) {
        store$.outbox[txId].assign({
          status: 'pending',
          retryCount: 0,
          retryHeld: false,
          nextRetryAt: undefined,
          error: undefined,
        });
        reset += 1;
      }
    });

    // A manual retry must actually kick off a sync; otherwise the items just sit
    // `pending` until an unrelated trigger.
    if (reset > 0) {
      processOutbox();
    }
  },
};
