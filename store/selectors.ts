import { computed } from '@legendapp/state';

import { isToday } from '@/utils/isToday';
import { isValidOutboxItem } from './outboxPolicy';

import { store$ } from './store';

export const filteredCustomers$ = computed(() => {
  const query = store$.searchQuery.get().toLowerCase().trim();

  // Guard against null/malformed persisted records so a single bad entry can't
  // crash the list on load.
  const customers = Object.values(store$.customers.get()).filter(
    (customer) => customer && typeof customer.customerName === 'string',
  );

  if (!query) {
    return customers;
  }

  return customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(query) ||
      String(customer.accountNumber ?? '').includes(query),
  );
});

/**
 * Today's Transactions
 */
export const todaysTransactions$ = computed(() => {
  const outbox = store$.outbox.get();

  return Object.values(outbox)
    // Drop null/malformed persisted items before dereferencing their fields.
    .filter((item) => isValidOutboxItem(item) && isToday(item.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => ({
      ...item.payload,
      createdAt: item.createdAt,
      status: item.status,
      error: item.error,
      permanent: item.permanent,
    }));
});
/**
 * Today's Total Collection
 */
/**
 * Today's Collection Amount
 *
 * Feeds the daily collection-limit check (utils/collectionLimit.ts), so a
 * permanently-failed deposit (4xx rejection / unsupported bank type) — which
 * will never actually be collected — must NOT count against it, even though it
 * still shows up in todaysTransactions$'s history for visibility.
 */
export const todaysCollectionAmount$ = computed(() => {
  const transactions = todaysTransactions$.get();

  return transactions.reduce((total, item) => {
    if (item.status === 'failed' && item.permanent) {
      return total;
    }
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
