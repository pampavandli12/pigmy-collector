jest.mock('../services/BluetoothPrinterService', () => ({
  __esModule: true,
  default: {
    printText: jest.fn(), setAlignment: jest.fn(), printLine: jest.fn(),
    printQRCode: jest.fn(), feedPaper: jest.fn(), cutPaper: jest.fn(),
  },
}));

import printer from '../services/BluetoothPrinterService';
import { ReceiptPrinter } from '../utils/ReceiptPrinter';

const receipt = {
  receiptNumber: '1', date: '18-07-2026', items: [], subtotal: 100, total: 100,
  customerName: 'Customer', accountNo: '10', receivedAmount: 100,
};

beforeEach(() => jest.clearAllMocks());

test('formats and prints a receipt', async () => {
  (printer.printText as jest.Mock).mockResolvedValue(true);
  await expect(ReceiptPrinter.printReceipt(receipt)).resolves.toBe(true);
  expect(printer.printText).toHaveBeenCalledWith(expect.stringContaining('Customer: Customer'));
});

test('returns false when native printing fails', async () => {
  jest.spyOn(console, 'error').mockImplementation();
  (printer.printText as jest.Mock).mockRejectedValue(new Error('printer failed'));
  await expect(ReceiptPrinter.printReceipt(receipt)).resolves.toBe(false);
});

test('prints QR details after a successful receipt', async () => {
  (printer.printText as jest.Mock).mockResolvedValue(true);
  await expect(ReceiptPrinter.printReceiptWithQR(receipt, 'details')).resolves.toBe(true);
  expect(printer.printQRCode).toHaveBeenCalledWith('details', 5, 0);
});
