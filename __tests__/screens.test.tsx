let mockAuthUser = {
  agentCode: 1,
  bankCode: 'B',
  lastDepositDate: '2099-01-01',
  graceDays: 3,
};

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    login: jest.fn(),
    logout: jest.fn(),
    setupPin: jest.fn(),
    unlockWithPin: jest.fn(),
  }),
}));
jest.mock('../hooks/useCustomerVoiceSearch', () => ({
  useCustomerVoiceSearch: () => ({ isActive: false, start: jest.fn(), cancel: jest.fn() }),
}));
jest.mock('../services/login', () => ({ userLogin: jest.fn() }));
jest.mock('../services/user', () => ({
  fetchCollections: jest.fn().mockResolvedValue({
    totalTransactions: 0,
    totalAmountCollected: 0,
  }),
}));
jest.mock('../store/actions', () => ({
  actions: { syncCustomers: jest.fn(), addTransaction: jest.fn() },
}));
jest.mock('../components/PrinterManager', () => {
  const { Text } = require('react-native');
  return () => <Text>Printer Manager</Text>;
});
jest.mock('expo-crypto', () => ({ randomUUID: () => 'transaction-id' }));
jest.mock('../contexts/PrinterContext', () => ({
  usePrinter: () => ({ isConnected: false }),
}));
jest.mock('../utils/ReceiptPrinter', () => ({
  ReceiptPrinter: { printReceipt: jest.fn() },
}));

import { fetchCollections } from '../services/user';
import { render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import Dashboard from '../app/(tabs)/dashboard';
import Support from '../app/(tabs)/support';
import Users from '../app/(tabs)/users';
import SignIn from '../app/index';
import PrinterScreen from '../app/printer';
import UserDetail from '../app/userDetail';
import { store$ } from '../store/store';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

const mockedFetchCollections = fetchCollections as jest.MockedFunction<
  typeof fetchCollections
>;

beforeEach(() => {
  mockAuthUser = {
    agentCode: 1,
    bankCode: 'B',
    lastDepositDate: '2099-01-01',
    graceDays: 3,
  };
  store$.customers.set({});
  store$.outbox.set({});
  store$.searchQuery.set('');
  mockedFetchCollections.mockResolvedValue({
    totalTransactions: 0,
    totalAmountCollected: 0,
  });
});

test('renders the sign-in screen', () => {
  const screen = render(<SignIn />, { wrapper });
  expect(screen.getByText('Agent Login')).toBeTruthy();
  expect(screen.getByText('Login')).toBeTruthy();
});

test('renders dashboard empty state and totals', async () => {
  const screen = render(<Dashboard />, { wrapper });
  expect(screen.getByText("Today's Collection")).toBeTruthy();
  await waitFor(() =>
    expect(mockedFetchCollections).toHaveBeenCalledWith({
      agentCode: 1,
      bankCode: 'B',
      graceDays: 3,
    }),
  );
  expect(screen.getByText('No transactions yet')).toBeTruthy();
});

test('renders dashboard totals from the collections API', async () => {
  mockedFetchCollections.mockResolvedValue({
    totalTransactions: 1,
    totalAmountCollected: 1500,
  });
  const screen = render(<Dashboard />, { wrapper });
  expect(await screen.findByText(/₹\s*1,500/)).toBeTruthy();
  expect(await screen.findByText("Today's Transactions")).toBeTruthy();
});

test('renders customer search and empty state after initial loading', () => {
  const screen = render(<Users />, { wrapper });
  expect(screen.getByPlaceholderText('Search customers')).toBeTruthy();
  expect(screen.getByText('No customers found')).toBeTruthy();
});

test('renders dashboard sync status labels', () => {
  const basePayload = { userId: 1, agentCode: 2, bankCode: 'B', collectedAmount: 10, schemename: 'P', collectiontype: 'cash', customerName: 'Customer', accountNumber: 3 };
  store$.outbox.set(Object.fromEntries(
    (['synced', 'pending', 'syncing', 'failed'] as const).map((status, index) => [
      status,
      {
        payload: { ...basePayload, transactionId: `tx-${status}` },
        status,
        retryCount: 0,
        createdAt: Date.now() + index,
      },
    ]),
  ));

  const screen = render(<Dashboard />, { wrapper });
  expect(screen.getByText('Synced')).toBeTruthy();
  expect(screen.getByText('Pending')).toBeTruthy();
  expect(screen.getByText('Syncing')).toBeTruthy();
  expect(screen.getByText('Failed')).toBeTruthy();
});

test('renders support and logout controls', () => {
  const screen = render(<Support />, { wrapper });
  expect(screen.getByText('Call Us')).toBeTruthy();
  expect(screen.getByText('Log out current account')).toBeTruthy();
});

test('renders the printer screen boundary', () => {
  const screen = render(<PrinterScreen />);
  expect(screen.getByText('Bluetooth Printer')).toBeTruthy();
  expect(screen.getByText('Printer Manager')).toBeTruthy();
});

test('renders the new deposit screen boundary', () => {
  const screen = render(<UserDetail />, { wrapper });
  expect(screen.getByText('New Deposit')).toBeTruthy();
  expect(screen.getByText('Deposit Details')).toBeTruthy();
});

test('blocks direct access to the deposit form after grace days expire', () => {
  mockAuthUser = {
    agentCode: 1,
    bankCode: 'B',
    lastDepositDate: '2026-08-01',
    graceDays: 3,
    limitAmount: 50000,
  };
  jest.useFakeTimers().setSystemTime(new Date(2026, 7, 5, 12));

  const screen = render(<UserDetail />, { wrapper });

  expect(
    screen.getByText(
      'You are exceeding grace days, please deposit the amount to bank',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Deposit Details')).toBeNull();
  expect(screen.getByText('Back to Users')).toBeTruthy();
  jest.useRealTimers();
});

test('blocks direct access to the deposit form when the daily limit is reached', () => {
  mockAuthUser = {
    agentCode: 1,
    bankCode: 'B',
    lastDepositDate: '2099-01-01',
    graceDays: 3,
    limitAmount: 50000,
  };
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

  expect(
    screen.getByText(
      'Daily collection limit exceeded. Please deposit the collected amount to the bank.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Deposit Details')).toBeNull();
});
