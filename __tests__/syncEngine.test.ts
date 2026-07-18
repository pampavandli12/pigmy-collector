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

test('deletes all outbox statuses from previous calendar days', () => {
  const old = new Date();
  old.setDate(old.getDate() - 1);
  old.setHours(23, 59, 59, 999);
  store$.outbox.set({
    old: { payload, status: 'failed', retryCount: 1, createdAt: old.getTime() },
    recent: { payload: { ...payload, transactionId: 'recent' }, status: 'pending', retryCount: 0, createdAt: Date.now() },
  });
  cleanupOutbox();
  expect(store$.outbox.old.peek()).toBeUndefined();
  expect(store$.outbox.recent.peek()).toBeDefined();
});
