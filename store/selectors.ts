import { computed } from '@legendapp/state';

import { isToday } from '@/utils/isToday';

import { store$ } from './store';

export const filteredCustomers$ = computed(() => {
  const query = store$.searchQuery.get().toLowerCase().trim();

  const customers = Object.values(store$.customers.get());

  if (!query) {
    return customers;
  }

  return customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(query) ||
      customer.accountNumber.toString().includes(query),
  );
});

/**
 * Today's Transactions
 */
export const todaysTransactions$ = computed(() => {
  const outbox = store$.outbox.get();

  return Object.values(outbox)
    .filter((item) => isToday(item.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => ({
      ...item.payload,
      createdAt: item.createdAt,
      status: item.status,
      error: item.error,
    }));
});
/**
 * Today's Total Collection
 */
/**
 * Today's Collection Amount
 */
export const todaysCollectionAmount$ = computed(() => {
  const transactions = todaysTransactions$.get();

  return transactions.reduce((total, item) => {
    return total + Number(item.collectedAmount || 0);
  }, 0);
});

/**
 * Today's Transaction Count
 */
export const todaysTransactionCount$ = computed(() => {
  return todaysTransactions$.get().length;
});

// Total customer count
export const totalCustomerCount$ = computed(() => {
  return Object.keys(store$.customers.get()).length;
});
