jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));
jest.mock('../services/user', () => ({ createTransaction: jest.fn() }));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import NetInfo from '@react-native-community/netinfo';
import { UnsupportedBankTypeError } from '../services/banks/errors';
import { createTransaction } from '../services/user';
import { resetOutboxSyncState } from '../store/syncCoordinator';
import { cleanupOutbox, processOutbox, stopOutboxSync } from '../store/syncEngine';
import { store$ } from '../store/store';
import { showSnackbar } from '../utils/snackbar';

const payload = {
  transactionId: 'tx-1', userId: 1, agentCode: 2, bankCode: 'B',
  collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38', collectiontype: 'cash',
  customerName: 'Customer', accountNumber: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetOutboxSyncState();
  // Clear any backoff retry timer armed by a previous test's failed item.
  stopOutboxSync();
  store$.outbox.set({});
  store$.customers.set({});
});

afterEach(() => {
  stopOutboxSync();
});

test('does not sync while offline', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
  store$.outbox['tx-1'].set({ payload, status: 'pending', retryCount: 0, createdAt: Date.now() });
  await processOutbox();
  expect(createTransaction).not.toHaveBeenCalled();
});

test('syncs oldest eligible transactions and marks them synced', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockResolvedValue({ ok: true });
  store$.outbox['tx-1'].set({ payload, status: 'pending', retryCount: 0, createdAt: Date.now() });
  await processOutbox();
  expect(store$.outbox['tx-1'].status.peek()).toBe('synced');
});

test('marks failed syncs and shows an error snackbar', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockRejectedValue(new Error('Server unavailable'));
  store$.outbox['tx-1'].set({ payload, status: 'pending', retryCount: 0, createdAt: Date.now() });
  await processOutbox();
  expect(store$.outbox['tx-1'].peek()).toMatchObject({ status: 'failed', retryCount: 1 });
  expect(showSnackbar).toHaveBeenCalledWith('Transaction sync failed: Server unavailable', { type: 'error' });
});

test('removes malformed persisted entries before attempting sync', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  store$.outbox.set({
    malformed: {
      status: 'failed',
      retryCount: 4,
      error: 'Network Error',
    },
  } as never);

  await processOutbox();

  expect(store$.outbox.malformed.peek()).toBeUndefined();
  expect(createTransaction).not.toHaveBeenCalled();
  expect(showSnackbar).not.toHaveBeenCalled();
});

test('retains all valid outbox statuses from previous calendar days', () => {
  const old = new Date();
  old.setDate(old.getDate() - 1);
  old.setHours(23, 59, 59, 999);
  store$.outbox.set({
    oldPending: { payload: { ...payload, transactionId: 'old-pending' }, status: 'pending', retryCount: 0, createdAt: old.getTime() },
    oldSyncing: { payload: { ...payload, transactionId: 'old-syncing' }, status: 'syncing', retryCount: 0, createdAt: old.getTime() },
    oldFailed: { payload: { ...payload, transactionId: 'old-failed' }, status: 'failed', retryCount: 1, createdAt: old.getTime() },
    oldSynced: { payload: { ...payload, transactionId: 'old-synced' }, status: 'synced', retryCount: 0, createdAt: old.getTime() },
    recent: { payload: { ...payload, transactionId: 'recent' }, status: 'pending', retryCount: 0, createdAt: Date.now() },
  });
  cleanupOutbox();
  expect(Object.keys(store$.outbox.peek())).toEqual([
    'oldPending',
    'oldSyncing',
    'oldFailed',
    'oldSynced',
    'recent',
  ]);
  expect(store$.outbox.recent.peek()).toBeDefined();
});

test('syncs a failed transaction from a previous day and retains it', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockResolvedValue({ ok: true });
  const old = new Date();
  old.setDate(old.getDate() - 1);
  store$.outbox.old.set({
    payload: { ...payload, transactionId: 'old' },
    status: 'failed',
    retryCount: 1,
    createdAt: old.getTime(),
  });

  await processOutbox();

  expect(createTransaction).toHaveBeenCalledWith(
    expect.objectContaining({ transactionId: 'old' }),
  );
  expect(store$.outbox.old.peek()).toMatchObject({ status: 'synced' });
});

test('posts a transaction left in the syncing state', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockResolvedValue({ ok: true });
  store$.outbox['tx-1'].set({
    payload,
    status: 'syncing',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();

  expect(createTransaction).toHaveBeenCalledWith(
    expect.objectContaining({ transactionId: 'tx-1' }),
  );
  expect(store$.outbox['tx-1'].status.peek()).toBe('synced');
});

test('posts a transaction queued while a sync is already running', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  let releaseFirst: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let enteredFirst: () => void = () => undefined;
  const entered = new Promise<void>((resolve) => {
    enteredFirst = resolve;
  });

  (createTransaction as jest.Mock).mockImplementation(
    async (body: { transactionId: string }) => {
      if (body.transactionId === 'tx-1') {
        store$.outbox['tx-2'].set({
          payload: { ...payload, transactionId: 'tx-2' },
          status: 'pending',
          retryCount: 0,
          createdAt: Date.now(),
        });
        void processOutbox();
        enteredFirst();
        await gate;
      }
      return { ok: true };
    },
  );

  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });

  const done = processOutbox();
  await entered;
  expect(createTransaction).toHaveBeenCalledTimes(1);
  releaseFirst();
  await done;

  expect(createTransaction).toHaveBeenCalledTimes(2);
  expect(store$.outbox['tx-2'].status.peek()).toBe('synced');
});

test('does not post while connected without internet', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({
    isConnected: true,
    isInternetReachable: false,
  });
  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();

  expect(createTransaction).not.toHaveBeenCalled();
  expect(store$.outbox['tx-1'].status.peek()).toBe('pending');
});

test('returns an interrupted sync to pending while offline', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
  store$.outbox['tx-1'].set({
    payload,
    status: 'syncing',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();

  expect(createTransaction).not.toHaveBeenCalled();
  expect(store$.outbox['tx-1'].status.peek()).toBe('pending');
});

test('waits before retrying a network failure and snackbars once', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockRejectedValue(new Error('Server unavailable'));
  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();
  await processOutbox();

  expect(createTransaction).toHaveBeenCalledTimes(1);
  expect(store$.outbox['tx-1'].peek()).toMatchObject({
    status: 'failed',
    retryCount: 1,
  });
  expect(store$.outbox['tx-1'].nextRetryAt.peek()).toBeGreaterThan(Date.now());
  expect(showSnackbar).toHaveBeenCalledTimes(1);
});

test('holds an unsupported bank type until it is manually retried', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockRejectedValue(
    new UnsupportedBankTypeError('other'),
  );
  store$.outbox['tx-1'].set({
    payload: { ...payload, bankType: 'other' },
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();
  await processOutbox();

  expect(createTransaction).toHaveBeenCalledTimes(1);
  expect(store$.outbox['tx-1'].peek()).toMatchObject({
    status: 'failed',
    retryCount: 1,
    retryHeld: true,
  });
});

test('holds a client rejection until it is manually retried', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  const rejection = new Error('Rejected');
  Object.assign(rejection, { response: { status: 400 } });
  (createTransaction as jest.Mock).mockRejectedValue(rejection);
  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });

  await processOutbox();
  await processOutbox();

  expect(createTransaction).toHaveBeenCalledTimes(1);
  expect(store$.outbox['tx-1'].peek()).toMatchObject({
    status: 'failed',
    retryHeld: true,
  });
});

test('reverts the customer balance once a deposit permanently fails, but not on a transient failure', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  store$.customers[payload.accountNumber].set({
    accountNumber: payload.accountNumber,
    customerName: 'Customer',
    currentBalance: 500,
    lastDepositDate: '',
    schemeId: '38',
    agentCode: 2,
    bankCode: 'B',
    mobilenumber: '9',
    userId: 1,
  });

  // A transient (non-4xx) failure must NOT touch the balance — the deposit may
  // still succeed on retry.
  (createTransaction as jest.Mock).mockRejectedValueOnce(new Error('Server unavailable'));
  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });
  await processOutbox();
  expect(store$.customers[payload.accountNumber].currentBalance.peek()).toBe(500);

  // A definite client rejection (4xx) permanently fails — the balance must be
  // reverted back out since this amount was never actually collected.
  const rejection = new Error('Rejected');
  Object.assign(rejection, { response: { status: 400 } });
  (createTransaction as jest.Mock).mockRejectedValueOnce(rejection);
  store$.outbox['tx-1'].assign({
    status: 'pending',
    nextRetryAt: undefined,
  });
  await processOutbox();

  expect(store$.outbox['tx-1'].peek()).toMatchObject({
    status: 'failed',
    permanent: true,
    balanceReverted: true,
  });
  expect(store$.customers[payload.accountNumber].currentBalance.peek()).toBe(400);
});

test('schedules a backoff retry that drains the queue when it becomes due', async () => {
  jest.useFakeTimers();
  try {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (createTransaction as jest.Mock).mockRejectedValueOnce(
      new Error('Server unavailable'),
    );
    store$.outbox['tx-1'].set({
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    });

    await processOutbox();
    expect(store$.outbox['tx-1'].peek()).toMatchObject({
      status: 'failed',
      retryCount: 1,
    });

    // The next attempt succeeds; firing the scheduled backoff timer must
    // re-drain the queue with no external trigger.
    (createTransaction as jest.Mock).mockResolvedValueOnce({ ok: true });
    await jest.runOnlyPendingTimersAsync();

    expect(createTransaction).toHaveBeenCalledTimes(2);
    expect(store$.outbox['tx-1'].status.peek()).toBe('synced');
  } finally {
    jest.useRealTimers();
  }
});

test('stops automatic retries after the retry cap', async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  (createTransaction as jest.Mock).mockRejectedValue(new Error('Server unavailable'));
  store$.outbox['tx-1'].set({
    payload,
    status: 'pending',
    retryCount: 4,
    createdAt: Date.now(),
  });

  await processOutbox();
  await processOutbox();

  expect(createTransaction).toHaveBeenCalledTimes(1);
  expect(store$.outbox['tx-1'].peek()).toMatchObject({
    status: 'failed',
    retryCount: 5,
    retryHeld: true,
  });
});
