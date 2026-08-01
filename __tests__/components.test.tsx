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
jest.mock('../utils/receiptPdf', () => ({
  buildReceiptPdfDocument: jest.fn(() => ({ filename: 'receipt.pdf' })),
  generateReceiptPdf: jest.fn().mockResolvedValue('file:///receipt.pdf'),
}));
jest.mock('../utils/whatsappReceipt', () => ({
  getReceiptSharingUnavailableMessage: jest.fn().mockReturnValue(null),
  hasUsablePhoneNumber: (phone: string) => /^\d{10,15}$/.test(phone),
  isShareCancellationError: jest.fn().mockReturnValue(false),
  shareReceiptToWhatsApp: jest.fn().mockResolvedValue(undefined),
  WhatsAppUnavailableError: class WhatsAppUnavailableError extends Error {},
}));
jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      agentCode: 1,
      agentName: 'Agent',
      bankCode: 'BANK',
      bankName: 'Pigmy Bank',
      token: 'token',
      phoneNumber: '9876543210',
    },
  }),
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SMS from 'expo-sms';
import { PaperProvider } from 'react-native-paper';
import { AppSnackbar } from '../components/AppSnackbar';
import PrinterManager from '../components/PrinterManager';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionSuccess } from '../components/TransactionSuccess';
import { ReceiptPrinter } from '../utils/ReceiptPrinter';
import { generateReceiptPdf } from '../utils/receiptPdf';
import { showSnackbar } from '../utils/snackbar';
import { shareReceiptToWhatsApp } from '../utils/whatsappReceipt';
import { getReceiptSharingUnavailableMessage } from '../utils/whatsappReceipt';

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
  const screen = render(
    <>
      <TransactionSuccess
        customerName='Customer'
        mobilenumber='9123456780'
        openingBalance={100}
        totalBalance={200}
      />
      <AppSnackbar />
    </>,
    { wrapper },
  );
  fireEvent.press(screen.getByText('Send SMS'));
  await waitFor(() =>
    expect(
      screen.getByText('SMS is not available on this device.'),
    ).toBeTruthy(),
  );
});

test('opens SMS composer with bank name and post-transaction balance', async () => {
  const isAvailableAsync = SMS.isAvailableAsync as jest.Mock;
  const sendSMSAsync = SMS.sendSMSAsync as jest.Mock;
  sendSMSAsync.mockClear();
  isAvailableAsync.mockResolvedValueOnce(true);

  const screen = render(
    <TransactionSuccess
      customerName='Customer'
      customerId='2053'
      accountNumber='60001'
      amount='₹100'
      openingBalance={900}
      totalBalance={1000}
      scheme='Pigmy Deposit'
      date='July 24, 2026'
      mobilenumber='9123456780'
    />,
    { wrapper },
  );

  fireEvent.press(screen.getByText('Send SMS'));

  await waitFor(() => expect(sendSMSAsync).toHaveBeenCalledTimes(1));
  expect(sendSMSAsync).toHaveBeenCalledWith(
    ['9123456780'],
    expect.stringContaining('Pigmy Bank'),
  );
  const smsBody = sendSMSAsync.mock.calls[0][1];
  expect(smsBody).toContain('₹100');
  expect(smsBody).toContain('Total Balance: ₹1,000.00');
  expect(smsBody).toContain('Account No: 60001');
});

test('prints bank and agent details without the customer phone number', async () => {
  const printReceipt = ReceiptPrinter.printReceipt as jest.Mock;
  printReceipt.mockClear();
  printReceipt.mockResolvedValueOnce(true);

  const screen = render(
    <TransactionSuccess
      customerName='Customer'
      customerId='2053'
      accountNumber='60001'
      amount='₹100'
      openingBalance={900}
      totalBalance={1000}
      mobilenumber='9123456780'
    />,
    { wrapper },
  );

  fireEvent.press(screen.getByText('Print Receipt'));

  await waitFor(() => expect(printReceipt).toHaveBeenCalledTimes(1));
  const receiptData = printReceipt.mock.calls[0][0];
  expect(receiptData).toEqual(
    expect.objectContaining({
      bankName: 'Pigmy Bank',
      collectorName: 'Agent',
      collectorPhone: '9876543210',
      customerName: 'Customer',
      accountNo: '60001',
      openingBalance: 900,
      receivedAmount: 100,
      totalBalance: 1000,
    }),
  );
  expect(JSON.stringify(receiptData)).not.toContain('9123456780');
});

test('shows a snackbar when receipt printing fails', async () => {
  const printReceipt = ReceiptPrinter.printReceipt as jest.Mock;
  printReceipt.mockClear();
  printReceipt.mockResolvedValueOnce(false);

  const screen = render(
    <>
      <TransactionSuccess openingBalance={100} totalBalance={200} />
      <AppSnackbar />
    </>,
    { wrapper },
  );

  fireEvent.press(screen.getByText('Print Receipt'));

  await waitFor(() =>
    expect(screen.getByText('Failed to print receipt.')).toBeTruthy(),
  );
});

test('keeps success actions and Done available in the responsive layout', () => {
  const screen = render(
    <TransactionSuccess openingBalance={100} totalBalance={200} />,
    { wrapper },
  );

  expect(screen.getByText('Send SMS')).toBeTruthy();
  expect(screen.getByText('Print Receipt')).toBeTruthy();
  expect(screen.getByText('Send to WhatsApp')).toBeTruthy();
  expect(screen.getByText('Done')).toBeTruthy();
});

test('disables SMS and WhatsApp when the customer has no valid phone number', () => {
  const screen = render(
    <TransactionSuccess
      mobilenumber=''
      openingBalance={100}
      totalBalance={200}
    />,
    { wrapper },
  );

  expect(
    screen.getByRole('button', { name: 'Send SMS' }).props.accessibilityState
      .disabled,
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: 'Send to WhatsApp' }).props
      .accessibilityState.disabled,
  ).toBe(true);
});

test('generates and shares a PDF receipt through WhatsApp', async () => {
  const generate = generateReceiptPdf as jest.Mock;
  const share = shareReceiptToWhatsApp as jest.Mock;
  generate.mockClear();
  share.mockClear();

  const screen = render(
    <TransactionSuccess
      customerName='Customer'
      customerId='2053'
      accountNumber='60001'
      amount='₹100'
      openingBalance={900}
      totalBalance={1000}
      scheme='Pigmy Deposit'
      date='July 30, 2026'
      mobilenumber='9123456780'
    />,
    { wrapper },
  );

  fireEvent.press(screen.getByText('Send to WhatsApp'));

  await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(generate.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      accountNo: '60001',
      receivedAmount: 100,
      totalBalance: 1000,
    }),
  );
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      pdfUri: 'file:///receipt.pdf',
      phone: '9123456780',
      filename: 'receipt.pdf',
    }),
  );
});

test('reports an outdated native build without importing receipt modules', async () => {
  const availability = getReceiptSharingUnavailableMessage as jest.Mock;
  const generate = generateReceiptPdf as jest.Mock;
  availability.mockReturnValueOnce('Receipt sharing requires the latest app build.');
  generate.mockClear();

  const screen = render(
    <>
      <TransactionSuccess
        mobilenumber='9123456780'
        openingBalance={100}
        totalBalance={200}
      />
      <AppSnackbar />
    </>,
    { wrapper },
  );

  fireEvent.press(screen.getByText('Send to WhatsApp'));

  await waitFor(() =>
    expect(
      screen.getByText('Receipt sharing requires the latest app build.'),
    ).toBeTruthy(),
  );
  expect(generate).not.toHaveBeenCalled();
});

test('renders printer connection state and actions', () => {
  const screen = render(<PrinterManager />);
  expect(screen.getByText('Connected')).toBeTruthy();
  expect(screen.getByText('Print Test Page')).toBeTruthy();
});
