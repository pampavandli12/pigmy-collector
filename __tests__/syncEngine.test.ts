jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));
jest.mock('../services/user', () => ({ createTransaction: jest.fn() }));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import NetInfo from '@react-native-community/netinfo';
import { createTransaction } from '../services/user';
import { cleanupOutbox, processOutbox } from '../store/syncEngine';
import { store$ } from '../store/store';
import { showSnackbar } from '../utils/snackbar';

const payload = {
  transactionId: 'tx-1', userId: 1, agentCode: 2, bankCode: 'B',
  collectedAmount: 100, schemename: 'Pigmy Deposit', collectiontype: 'cash',
  customerName: 'Customer', accountNumber: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
  store$.outbox.set({});
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
