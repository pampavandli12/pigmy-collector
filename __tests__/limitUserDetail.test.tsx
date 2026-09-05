const mockAddTransaction = jest.fn();

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      lastDepositDate: '2099-01-01',
      graceDays: 3,
      limitAmount: 50000,
    },
  }),
}));
jest.mock('../store/actions', () => ({
  actions: { addTransaction: mockAddTransaction },
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
import { store$ } from '../store/store';
import { COLLECTION_LIMIT_EXCEEDED_MESSAGE } from '../utils/collectionLimit';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  store$.outbox.set({});
});

test('blocks the deposit form when the daily collection limit is already reached', () => {
  store$.outbox.set({
    'tx-1': {
      payload: {
        transactionId: 'tx-1',
        userId: 1,
        agentCode: 1,
        bankCode: 'B',
        collectedAmount: 50000,
        schemename: 'Pigmy Deposit',
        collectiontype: 'cash',
        customerName: 'Customer',
        accountNumber: 3,
      },
      status: 'synced',
      retryCount: 0,
      createdAt: Date.now(),
    },
  });

  const screen = render(<UserDetail />, { wrapper });

  expect(screen.getByText(COLLECTION_LIMIT_EXCEEDED_MESSAGE)).toBeTruthy();
  expect(screen.queryByText('Deposit Details')).toBeNull();
});

test('blocks confirmation when a new deposit would exceed the daily limit', () => {
  store$.outbox.set({
    'tx-1': {
      payload: {
        transactionId: 'tx-1',
        userId: 1,
        agentCode: 1,
        bankCode: 'B',
        collectedAmount: 49000,
        schemename: 'Pigmy Deposit',
        collectiontype: 'cash',
        customerName: 'Customer',
        accountNumber: 3,
      },
      status: 'synced',
      retryCount: 0,
      createdAt: Date.now(),
    },
  });

  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => ['1001', jest.fn()])
    .mockImplementationOnce(() => ['Pigmy Deposit', jest.fn()])
    .mockImplementationOnce(() => ['January 1, 2026', jest.fn()]);

  const screen = render(<UserDetail />, { wrapper });
  fireEvent.press(screen.getByText('Test Confirm'));

  expect(mockAddTransaction).not.toHaveBeenCalled();
  expect(showSnackbar).toHaveBeenCalledWith(
    COLLECTION_LIMIT_EXCEEDED_MESSAGE,
    { type: 'error', duration: 6000 },
  );

  useStateSpy.mockRestore();
});
