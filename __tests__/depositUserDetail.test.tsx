let mockAuthUser: {
  lastDepositDate: string;
  graceDays: number;
  limitAmount: number;
  bankType: string;
  agentName: string;
  schemes: { schemeId: string; schemeName: string }[];
} = {
  lastDepositDate: '2099-01-01',
  graceDays: 3,
  limitAmount: 50000,
  bankType: 'banksoft',
  agentName: 'Agent',
  schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
};

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockAuthUser }),
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
    TransactionForm: ({
      handleConfirm,
      scheme,
      schemeLocked,
    }: {
      handleConfirm: () => void;
      scheme: string;
      schemeLocked?: boolean;
    }) => (
      <>
        <Text>Deposit Details</Text>
        <Text testID='scheme-value'>{scheme}</Text>
        <Text testID='scheme-locked'>{String(Boolean(schemeLocked))}</Text>
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
import { showSnackbar } from '../utils/snackbar';

const mockAddTransaction = actions.addTransaction as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

function renderConfirm(amount = '150') {
  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => [amount, jest.fn()])
    .mockImplementationOnce(() => ['38', jest.fn()])
    .mockImplementationOnce(() => ['January 1, 2026', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()]);

  const screen = render(<UserDetail />, { wrapper });
  fireEvent.press(screen.getByText('Test Confirm'));
  useStateSpy.mockRestore();
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  store$.customers.set({});
  store$.outbox.set({});
  mockAuthUser = {
    lastDepositDate: '2099-01-01',
    graceDays: 3,
    limitAmount: 50000,
    bankType: 'banksoft',
    agentName: 'Agent',
    schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
  };
  mockAddTransaction.mockReturnValue(true);
});

test('queues a banksoft deposit without finalAmount', () => {
  renderConfirm();

  expect(showSnackbar).not.toHaveBeenCalled();
  expect(mockAddTransaction).toHaveBeenCalledWith({
    userId: 1,
    agentCode: 2,
    bankCode: 'B',
    collectedAmount: 150,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 3,
    transactionId: 'transaction-id',
    bankType: 'banksoft',
  });
  expect(mockAddTransaction.mock.calls[0][0]).not.toHaveProperty('finalAmount');
});

test('queues a peocit deposit with finalAmount equal to collected amount plus balance', () => {
  mockAuthUser = { ...mockAuthUser, bankType: 'peocit' };

  renderConfirm();

  expect(mockAddTransaction).toHaveBeenCalledWith({
    userId: 1,
    agentCode: 2,
    bankCode: 'B',
    collectedAmount: 150,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 3,
    transactionId: 'transaction-id',
    bankType: 'peocit',
    agentName: 'Agent',
    finalAmount: 250,
    vpncode: '123456',
  });
});

test('ignores a second confirm while the first deposit is still submitting', () => {
  const useStateSpy = jest.spyOn(React, 'useState');
  useStateSpy
    .mockImplementationOnce(() => [null, jest.fn()])
    .mockImplementationOnce(() => ['150', jest.fn()])
    .mockImplementationOnce(() => ['38', jest.fn()])
    .mockImplementationOnce(() => ['January 1, 2026', jest.fn()])
    .mockImplementationOnce(() => [false, jest.fn()]);

  const screen = render(<UserDetail />, { wrapper });
  const confirm = screen.getByText('Test Confirm');
  mockAddTransaction.mockImplementation(() => {
    fireEvent.press(confirm);
    return true;
  });
  fireEvent.press(confirm);
  useStateSpy.mockRestore();

  expect(mockAddTransaction).toHaveBeenCalledTimes(1);
});

test('pre-selects and locks the scheme when the customer has a matching schemeId', () => {
  store$.customers.set({
    3: {
      accountNumber: 3,
      customerName: 'Customer',
      currentBalance: 10,
      lastDepositDate: '2026-01-01',
      schemeId: '38',
      agentCode: 2,
      bankCode: 'B',
      mobilenumber: null,
      userId: 1,
    },
  });

  const screen = render(<UserDetail />, { wrapper });

  expect(screen.getByTestId('scheme-value').props.children).toBe('38');
  expect(screen.getByTestId('scheme-locked').props.children).toBe('true');
});

test('leaves the scheme editable when the customer has no matching schemeId', () => {
  store$.customers.set({
    3: {
      accountNumber: 3,
      customerName: 'Customer',
      currentBalance: 10,
      lastDepositDate: '2026-01-01',
      schemeId: 'unknown-scheme',
      agentCode: 2,
      bankCode: 'B',
      mobilenumber: null,
      userId: 1,
    },
  });

  const screen = render(<UserDetail />, { wrapper });

  expect(screen.getByTestId('scheme-value').props.children).toBe('');
  expect(screen.getByTestId('scheme-locked').props.children).toBe('false');
});
