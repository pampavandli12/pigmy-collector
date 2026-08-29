const mockPush = jest.fn();
const mockVoiceCancel = jest.fn();
const mockVoiceStart = jest.fn();
let mockVoiceResult: ((transcript: string) => void) | undefined;
let mockAuthUser = {
  agentCode: 11,
  bankCode: 'BANK',
  lastDepositDate: '2099-01-01',
  graceDays: 3,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));
jest.mock('@/store/actions', () => ({
  actions: { syncCustomers: jest.fn() },
}));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));
jest.mock('../hooks/useCustomerVoiceSearch', () => ({
  useCustomerVoiceSearch: (onResult: (transcript: string) => void) => {
    mockVoiceResult = onResult;
    return {
      isActive: false,
      start: mockVoiceStart,
      cancel: mockVoiceCancel,
    };
  },
}));

import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import Users from '../app/(tabs)/users';
import { actions } from '../store/actions';
import { store$ } from '../store/store';
import { Customer } from '../types/user';
import { GRACE_PERIOD_EXCEEDED_MESSAGE } from '../utils/gracePeriod';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

function makeCustomer(accountNumber: number): Customer {
  return {
    accountNumber,
    customerName: `Customer ${accountNumber}`,
    currentBalance: accountNumber,
    lastDepositDate: '2026-01-01',
    schemeId: 'PIGMY',
    agentCode: 11,
    bankCode: 'BANK',
    mobilenumber: '9876543210',
    userId: accountNumber,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (actions.syncCustomers as jest.Mock).mockResolvedValue(undefined);
  mockVoiceResult = undefined;
  mockAuthUser = {
    agentCode: 11,
    bankCode: 'BANK',
    lastDepositDate: '2099-01-01',
    graceDays: 3,
  };
  store$.customers.set({});
  store$.searchQuery.set('');
  store$.isRefreshingCustomers.set(false);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('virtualizes a collection of 5,000 customers with bounded batches', () => {
  const customers = Object.fromEntries(
    Array.from({ length: 5000 }, (_, index) => [index + 1, makeCustomer(index + 1)]),
  );
  store$.customers.set(customers);
  const screen = render(<Users />, { wrapper });
  const list = screen.UNSAFE_getByType(FlatList);

  expect(list.props.data).toHaveLength(5000);
  expect(list.props.initialNumToRender).toBe(10);
  expect(list.props.maxToRenderPerBatch).toBe(8);
  expect(list.props.windowSize).toBe(7);
});

test('loads customers automatically on initial mount', () => {
  render(<Users />, { wrapper });
  expect(actions.syncCustomers).toHaveBeenCalledWith(11, 'BANK');
});

test('shows initial loading feedback before an empty result', () => {
  (actions.syncCustomers as jest.Mock).mockImplementation(() => {
    store$.isRefreshingCustomers.set(true);
    return new Promise(() => undefined);
  });

  const screen = render(<Users />, { wrapper });

  expect(screen.getByText('Loading customers...')).toBeTruthy();
  expect(screen.queryByText('No customers found')).toBeNull();
});

test('debounces typed filtering and coalesces rapid changes', () => {
  const screen = render(<Users />, { wrapper });
  const search = screen.getByPlaceholderText('Search customers');

  fireEvent.changeText(search, 'Cus');
  fireEvent.changeText(search, 'Customer');
  expect(store$.searchQuery.peek()).toBe('');

  act(() => jest.advanceTimersByTime(149));
  expect(store$.searchQuery.peek()).toBe('');
  act(() => jest.advanceTimersByTime(1));
  expect(store$.searchQuery.peek()).toBe('Customer');
  expect(search.props.value).toBe('Customer');
});

test('applies voice results immediately', () => {
  const screen = render(<Users />, { wrapper });
  act(() => mockVoiceResult?.('Voice Customer'));
  expect(store$.searchQuery.peek()).toBe('Voice Customer');
  expect(screen.getByPlaceholderText('Search customers').props.value).toBe(
    'Voice Customer',
  );
});

test('preserves refresh and customer navigation behavior', () => {
  store$.customers.set({ 42: makeCustomer(42) });
  const screen = render(<Users />, { wrapper });
  const list = screen.UNSAFE_getByType(FlatList);

  act(() => list.props.refreshControl.props.onRefresh());
  expect(actions.syncCustomers).toHaveBeenCalledWith(11, 'BANK');

  fireEvent.press(screen.getByText('Customer 42'));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({
      pathname: '/userDetail',
      params: expect.objectContaining({ account: '42' }),
    }),
  );
});

test('blocks customer navigation when the agent exceeds grace days', () => {
  mockAuthUser = {
    agentCode: 11,
    bankCode: 'BANK',
    lastDepositDate: '2026-08-01',
    graceDays: 3,
  };
  jest.setSystemTime(new Date(2026, 7, 5, 12));
  store$.customers.set({ 42: makeCustomer(42) });
  const screen = render(<Users />, { wrapper });

  fireEvent.press(screen.getByText('Customer 42'));

  expect(mockPush).not.toHaveBeenCalled();
  expect(showSnackbar).toHaveBeenCalledWith(GRACE_PERIOD_EXCEEDED_MESSAGE, {
    type: 'error',
    duration: 6000,
  });
});
