import { computed } from '@legendapp/state';

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

function isToday(timestamp: number) {
  const today = new Date();

  const date = new Date(timestamp);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Today's Transactions
 */
export const todaysTransactions$ = computed(() => {
  const outbox = store$.outbox.get();

  return Object.values(outbox)
    .filter((item) => isToday(item.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt);
});

/**
 * Today's Total Collection
 */
export const todaysCollectionAmount$ = computed(() => {
  const transactions = todaysTransactions$.get();

  return transactions.reduce((total, item) => {
    return total + Number(item.payload.collectedAmount || 0);
  }, 0);
});

/**
 * Today's Transaction Count
 */
export const todaysTransactionCount$ = computed(() => {
  return todaysTransactions$.get().length;
});
