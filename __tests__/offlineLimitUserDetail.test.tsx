const mockNetInfo = { isConnected: false, isInternetReachable: false };
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockNetInfo,
}));
jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      offlineTransactionLimit: 2,
      bankType: 'banksoft',
      schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
    },
  }),
}));
jest.mock('../store/actions', () => ({
  actions: { addTransaction: jest.fn() },
}));
jest.mock('../utils/snackbar', () => ({
  showSnackbar: jest.fn(),
}));
jest.mock('../components/TransactionForm', () => {
  const { Button, Text } = require('react-native-paper');
  return {
    TransactionForm: ({ handleConfirm }: { handleConfirm: () => void }) => (
      <>
        <Text>Deposit Details</Text>
        <Button onPress={handleConfirm}>Test Confirm</Button>
      </>
    ),
  };
});
jest.mock('../components/TransactionSuccess', () => ({
  TransactionSuccess: () => null,
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'transaction-id' }));

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import UserDetail from '../app/userDetail';
import { actions } from '../store/actions';
import { store$ } from '../store/store';
import { OFFLINE_TRANSACTION_LIMIT_EXCEEDED_MESSAGE } from '../utils/offlineTransactionLimit';
import { showSnackbar } from '../utils/snackbar';

const mockAddTransaction = actions.addTransaction as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

function pendingOutboxItem(transactionId: string) {
  return {
    payload: {
      transactionId,
      userId: 1,
      agentCode: 1,
      bankCode: 'B',
      collectedAmount: 100,
      schemename: 'Pigmy Deposit',
      schemeId: '38',
      collectiontype: 'cash',
      customerName: 'Customer',
      accountNumber: '3',
    },
    status: 'pending' as const,
    retryCount: 0,
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  store$.outbox.set({});
  mockNetInfo.isConnected = false;
  mockNetInfo.isInternetReachable = false;
});

test('blocks the deposit form when the offline deposit limit is already reached', () => {
  store$.outbox.set({
    'tx-1': pendingOutboxItem('tx-1'),
    'tx-2': pendingOutboxItem('tx-2'),
  });

  const screen = render(<UserDetail />, { wrapper });

  expect(
    screen.getByText(OFFLINE_TRANSACTION_LIMIT_EXCEEDED_MESSAGE),
  ).toBeTruthy();
  expect(screen.queryByText('Deposit Details')).toBeNull();
});

test('allows confirmation when the pending count is still under the offline limit', () => {
  store$.outbox.set({ 'tx-1': pendingOutboxItem('tx-1') });

  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => ['100', jest.fn()])
    .mockImplementationOnce(() => ['38', jest.fn()])
    .mockImplementationOnce(() => ['January 1, 2026', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()]);

  const screen = render(<UserDetail />, { wrapper });

  expect(screen.getByText('Deposit Details')).toBeTruthy();

  fireEvent.press(screen.getByText('Test Confirm'));

  expect(showSnackbar).not.toHaveBeenCalledWith(
    OFFLINE_TRANSACTION_LIMIT_EXCEEDED_MESSAGE,
    expect.anything(),
  );
  expect(mockAddTransaction).toHaveBeenCalled();

  useStateSpy.mockRestore();
});

test('does not block when online and the unsynced backlog is within the limit', () => {
  mockNetInfo.isConnected = true;
  mockNetInfo.isInternetReachable = true;
  store$.outbox.set({
    'tx-1': pendingOutboxItem('tx-1'),
    'tx-2': pendingOutboxItem('tx-2'),
  });

  const screen = render(<UserDetail />, { wrapper });

  expect(screen.queryByText(OFFLINE_TRANSACTION_LIMIT_EXCEEDED_MESSAGE)).toBeNull();
  expect(screen.getByText('Deposit Details')).toBeTruthy();
});
