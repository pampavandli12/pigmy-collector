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

import { render } from '@testing-library/react-native';
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
});

test('renders the sign-in screen', () => {
  const screen = render(<SignIn />, { wrapper });
  expect(screen.getByText('Agent Login')).toBeTruthy();
  expect(screen.getByText('Login')).toBeTruthy();
});

test('renders dashboard empty state and totals', () => {
  const screen = render(<Dashboard />, { wrapper });
  expect(screen.getByText("Today's Collection")).toBeTruthy();
  expect(screen.getByText('No transactions yet')).toBeTruthy();
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
