jest.mock('../services/user', () => ({ fetchCustomers: jest.fn() }));
jest.mock('../store/syncEngine', () => ({ processOutbox: jest.fn(), cleanupOutbox: jest.fn() }));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import { fetchCustomers } from '../services/user';
import { actions } from '../store/actions';
import { todaysCollectionAmount$, todaysTransactionCount$, todaysTransactions$, totalCustomerCount$ } from '../store/selectors';
import { store$ } from '../store/store';
import { showSnackbar } from '../utils/snackbar';

beforeEach(() => {
  jest.clearAllMocks();
  store$.customers.set({});
  store$.outbox.set({});
  store$.isRefreshingCustomers.set(false);
});

test('syncs and indexes fetched customers by account number', async () => {
  (fetchCustomers as jest.Mock).mockResolvedValue([
    { accountNumber: 10, customerName: 'A', currentBalance: 100, lastDepositDate: '', schemeId: 'P', agentCode: 1, bankCode: 'B', mobilenumber: '9', userId: 2 },
  ]);
  await actions.syncCustomers(1, 'B');
  expect(store$.customers[10].customerName.peek()).toBe('A');
  expect(store$.isRefreshingCustomers.peek()).toBe(false);
});

test('shows a snackbar when customer refresh fails', async () => {
  (fetchCustomers as jest.Mock).mockRejectedValue(new Error('offline'));
  await actions.syncCustomers(1, 'B');
  expect(showSnackbar).toHaveBeenCalledWith('Unable to refresh customers. Showing offline data.', { type: 'error' });
});

test('adds a transaction only once and updates selectors', () => {
  const payload = { transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 75, schemename: 'P', collectiontype: 'cash', customerName: 'A', accountNumber: 3 };
  actions.addTransaction(payload);
  actions.addTransaction(payload);
  expect(todaysTransactionCount$.peek()).toBe(1);
  expect(todaysCollectionAmount$.peek()).toBe(75);
  expect(todaysTransactions$.peek()[0]).toMatchObject({
    transactionId: 'tx',
    status: 'pending',
  });
  expect(totalCustomerCount$.peek()).toBe(0);
});

test('keeps previous-day transactions out of today selectors', () => {
  const old = new Date();
  old.setDate(old.getDate() - 1);
  store$.outbox.old.set({
    payload: { transactionId: 'old', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 25, schemename: 'P', collectiontype: 'cash', customerName: 'A', accountNumber: 3 },
    status: 'synced',
    retryCount: 0,
    createdAt: old.getTime(),
  });

  expect(todaysTransactions$.peek()).toEqual([]);
  expect(todaysCollectionAmount$.peek()).toBe(0);
});
