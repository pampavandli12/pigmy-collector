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
  const payload = { transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 75, schemename: 'P', schemeId: '38', collectiontype: 'cash', customerName: 'A', accountNumber: 3, bankType: 'banksoft' };
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

test('excludes a permanently-failed deposit from the daily collection amount but keeps it in history', () => {
  store$.outbox.old.set({
    payload: { transactionId: 'ok', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 100, schemename: 'P', schemeId: '38', collectiontype: 'cash', customerName: 'A', accountNumber: 3 },
    status: 'synced',
    retryCount: 0,
    createdAt: Date.now(),
  });
  store$.outbox.rejected.set({
    payload: { transactionId: 'rejected', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 250, schemename: 'P', schemeId: '38', collectiontype: 'cash', customerName: 'A', accountNumber: 3 },
    status: 'failed',
    permanent: true,
    retryCount: 1,
    createdAt: Date.now(),
  });

  // Visible in the transaction history...
  expect(todaysTransactionCount$.peek()).toBe(2);
  // ...but the rejected amount must not count against the daily limit.
  expect(todaysCollectionAmount$.peek()).toBe(100);
});

test('excludes a permanently-failed deposit from unsynced balance totals on refresh', async () => {
  store$.outbox.rejected.set({
    payload: { transactionId: 'rejected', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 250, schemename: 'P', schemeId: '38', collectiontype: 'cash', customerName: 'A', accountNumber: 10 },
    status: 'failed',
    permanent: true,
    retryCount: 1,
    createdAt: Date.now(),
  });
  (fetchCustomers as jest.Mock).mockResolvedValue([
    { accountNumber: 10, customerName: 'A', currentBalance: 1000, lastDepositDate: '', schemeId: 'P', agentCode: 1, bankCode: 'B', mobilenumber: '9', userId: 2 },
  ]);
  await actions.syncCustomers(1, 'B');
  expect(store$.customers[10].currentBalance.peek()).toBe(1000);
});

test('keeps previous-day transactions out of today selectors', () => {
  const old = new Date();
  old.setDate(old.getDate() - 1);
  store$.outbox.old.set({
    payload: { transactionId: 'old', userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 25, schemename: 'P', schemeId: '38', collectiontype: 'cash', customerName: 'A', accountNumber: 3 },
    status: 'synced',
    retryCount: 0,
    createdAt: old.getTime(),
  });

  expect(todaysTransactions$.peek()).toEqual([]);
  expect(todaysCollectionAmount$.peek()).toBe(0);
});

test('refuses deposits that are not a positive finite amount', () => {
  const payload = {
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B',
    collectedAmount: 75,
    schemename: 'P',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'A',
    accountNumber: 3,
    bankType: 'banksoft' as const,
  };

  expect(actions.addTransaction({ ...payload, collectedAmount: 0 })).toBe(false);
  expect(actions.addTransaction({ ...payload, collectedAmount: -5 })).toBe(false);
  expect(actions.addTransaction({ ...payload, collectedAmount: Number.NaN })).toBe(false);
  expect(store$.outbox.peek()).toEqual({});
});

test('stores peocit final amount and rejects it on banksoft payloads', () => {
  const shared = {
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B',
    collectedAmount: 75,
    schemename: 'P',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'A',
    accountNumber: 3,
  };

  expect(
    actions.addTransaction({
      ...shared,
      bankType: 'banksoft',
      finalAmount: 175,
      agentName: 'Agent',
    }),
  ).toBe(false);
  expect(
    actions.addTransaction({
      ...shared,
      transactionId: 'tx-peocit',
      bankType: 'peocit',
      agentName: 'Agent',
      finalAmount: 175,
    }),
  ).toBe(true);
  expect(store$.outbox['tx-peocit'].payload.peek()).toMatchObject({
    bankType: 'peocit',
    agentName: 'Agent',
    finalAmount: 175,
    accountNumber: 3,
  });
  expect(store$.outbox.peek()).not.toHaveProperty('tx');
});

test('refuses a new deposit for a missing or unknown bank type', () => {
  const payload = {
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B',
    collectedAmount: 75,
    schemename: 'P',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'A',
    accountNumber: 3,
  };

  expect(actions.addTransaction(payload)).toBe(false);
  expect(actions.addTransaction({ ...payload, bankType: '' })).toBe(false);
  expect(actions.addTransaction({ ...payload, bankType: 'other' })).toBe(false);
  expect(store$.outbox.peek()).toEqual({});
});

test('adds only unsynced today amounts on top of the server balance', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const basePayload = {
    userId: 2,
    agentCode: 1,
    bankCode: 'B',
    schemename: 'P',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'A',
    accountNumber: 10,
  };
  store$.customers[10].set({
    accountNumber: 10,
    customerName: 'A',
    currentBalance: 999,
    lastDepositDate: '',
    schemeId: 'P',
    agentCode: 1,
    bankCode: 'B',
    mobilenumber: '9',
    userId: 2,
  });
  store$.outbox.set({
    oldSynced: {
      payload: { ...basePayload, transactionId: 'old', collectedAmount: 80 },
      status: 'synced',
      retryCount: 0,
      createdAt: yesterday.getTime(),
    },
    todaySynced: {
      payload: { ...basePayload, transactionId: 'synced', collectedAmount: 50 },
      status: 'synced',
      retryCount: 0,
      createdAt: Date.now(),
    },
    todayPending: {
      payload: { ...basePayload, transactionId: 'pending', collectedAmount: 20 },
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    },
  });
  (fetchCustomers as jest.Mock).mockResolvedValue([
    {
      accountNumber: 10,
      customerName: 'A',
      currentBalance: 150,
      lastDepositDate: '',
      schemeId: 'P',
      agentCode: 1,
      bankCode: 'B',
      mobilenumber: '9',
      userId: 2,
    },
  ]);

  await actions.syncCustomers(1, 'B');

  expect(store$.customers[10].currentBalance.peek()).toBe(170);
});

test('clears the retry hold when a failed transaction is retried', () => {
  store$.outbox.tx.set({
    payload: {
      transactionId: 'tx',
      userId: 1,
      agentCode: 2,
      bankCode: 'B',
      collectedAmount: 75,
      schemename: 'P',
      schemeId: '38',
      collectiontype: 'cash',
      customerName: 'A',
      accountNumber: 3,
    },
    status: 'failed',
    retryCount: 5,
    retryHeld: true,
    error: 'Rejected',
    createdAt: Date.now(),
  });

  actions.retryFailedTransactions();

  expect(store$.outbox.tx.peek()).toMatchObject({
    status: 'pending',
    retryCount: 0,
    retryHeld: false,
  });
});
