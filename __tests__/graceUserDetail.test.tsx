const mockAddTransaction = jest.fn();

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      lastDepositDate: '2026-08-01',
      graceDays: 3,
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
import { PaperProvider } from 'react-native-paper';
import UserDetail from '../app/userDetail';
import { GRACE_PERIOD_EXCEEDED_MESSAGE } from '../utils/gracePeriod';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 7, 4, 12));
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('rechecks the grace period when confirming after a date rollover', () => {
  const screen = render(<UserDetail />, { wrapper });
  expect(screen.getByText('Deposit Details')).toBeTruthy();

  jest.setSystemTime(new Date(2026, 7, 5, 0));
  fireEvent.press(screen.getByText('Test Confirm'));

  expect(mockAddTransaction).not.toHaveBeenCalled();
  expect(showSnackbar).toHaveBeenCalledWith(
    GRACE_PERIOD_EXCEEDED_MESSAGE,
    { type: 'error', duration: 6000 },
  );
});
