jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: { cache: 'file:///cache/' },
}));
jest.mock('../services/BluetoothPrinterService', () => ({
  __esModule: true,
  default: {},
}));

import { buildReceiptPdfDocument } from '../utils/receiptPdf';

const receipt = {
  bankName: 'Pigmy & Sons <Bank>',
  receiptNumber: 'TX-1',
  date: 'July 30, 2026',
  items: [{ name: 'Deposit', quantity: 1, price: 100, total: 100 }],
  subtotal: 100,
  total: 100,
  customerName: 'Customer <One>',
  accountNo: '60001',
  openingBalance: 200,
  receivedAmount: 100,
  totalBalance: 300,
  collectorName: 'Agent',
};

test('builds a narrow monospaced PDF document with escaped receipt content', () => {
  const document = buildReceiptPdfDocument(receipt);

  expect(document.width).toBe(227);
  expect(document.height).toBeGreaterThan(100);
  expect(document.filename).toMatch(/^receipt-60001-/);
  expect(document.html).toContain('font-family: "Courier New"');
  expect(document.html).toContain('Pigmy &amp; Sons &lt;Bank&gt;');
  expect(document.html).toContain('Customer: Customer &lt;One&gt;');
  expect(document.html).toContain('Opening Bal:');
  expect(document.html).toContain('Total Bal:');
});

test('increases PDF height when receipt content wraps to more lines', () => {
  const shortDocument = buildReceiptPdfDocument(receipt);
  const longDocument = buildReceiptPdfDocument({
    ...receipt,
    bankName:
      'Sri Lakshmi Venkateshwara Urban Cooperative Bank Limited With Branch',
    customerName: 'Customer With An Exceptionally Long Name For A Receipt',
  });

  expect(longDocument.height).toBeGreaterThan(shortDocument.height);
});
