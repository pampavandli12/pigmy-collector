jest.mock('../contexts/PrinterContext', () => ({
  usePrinter: () => ({
    isConnected: true,
    connectedDevice: { name: 'Printer', address: 'AA', paired: true, connected: true },
    availableDevices: [],
    isScanning: false,
    scanForDevices: jest.fn(),
    pairPrinter: jest.fn(),
    connectToPrinter: jest.fn(),
    disconnectPrinter: jest.fn(),
    requestPermissions: jest.fn(),
  }),
}));
jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  sendSMSAsync: jest.fn(),
}));
jest.mock('../utils/ReceiptPrinter', () => ({
  ReceiptPrinter: { printReceipt: jest.fn().mockResolvedValue(true) },
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AppSnackbar } from '../components/AppSnackbar';
import PrinterManager from '../components/PrinterManager';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionSuccess } from '../components/TransactionSuccess';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

test('renders global snackbar messages', () => {
  showSnackbar('Visible failure', { type: 'error' });
  const screen = render(<AppSnackbar />, { wrapper });
  expect(screen.getByText('Visible failure')).toBeTruthy();
});

test('keeps transaction confirmation disabled until values match', () => {
  const screen = render(
    <TransactionForm
      customer={{ id: '1', name: 'Customer', agentCode: 2, bankCode: 'B', balance: 10, account: '3', image: '' }}
      amount='100'
      setAmount={jest.fn()}
      scheme='Pigmy Deposit'
      setScheme={jest.fn()}
      date='July 18, 2026'
      handleConfirm={jest.fn()}
      isTransactionLoading={false}
    />,
    { wrapper },
  );
  expect(
    screen.getByRole('button', { name: 'Confirm + Save' }).props
      .accessibilityState.disabled,
  ).toBe(true);
});

test('shows an SMS error through the snackbar', async () => {
  const screen = render(<TransactionSuccess customerName='Customer' />, { wrapper });
  fireEvent.press(screen.getByText('Send SMS'));
  await waitFor(() => expect(screen.queryByText('Transaction Successful')).toBeTruthy());
});

test('renders printer connection state and actions', () => {
  const screen = render(<PrinterManager />);
  expect(screen.getByText('Connected')).toBeTruthy();
  expect(screen.getByText('Print Test Page')).toBeTruthy();
});
