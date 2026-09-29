const mockAddTransaction = jest.fn();

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      lastDepositDate: '2099-01-01',
      graceDays: 3,
      limitAmount: 50000,
      bankType: 'future-bank',
      agentName: 'Agent',
      schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
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
import { UNSUPPORTED_BANK_DEPOSIT_MESSAGE } from '../services/banks/registry';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

test('refuses a deposit for an unregistered bank before it is queued', () => {
  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => ['100', jest.fn()])
    .mockImplementationOnce(() => ['38', jest.fn()])
    .mockImplementationOnce(() => ['January 1, 2026', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()]);

  const screen = render(<UserDetail />, { wrapper });
  fireEvent.press(screen.getByText('Test Confirm'));

  expect(mockAddTransaction).not.toHaveBeenCalled();
  expect(showSnackbar).toHaveBeenCalledWith(UNSUPPORTED_BANK_DEPOSIT_MESSAGE, {
    type: 'error',
  });

  useStateSpy.mockRestore();
});
