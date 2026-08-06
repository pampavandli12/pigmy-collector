jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { cache: 'file:///cache/' },
}));
jest.mock('../services/BluetoothPrinterService', () => ({
  __esModule: true,
  default: {},
}));

import {
  buildReceiptPdfDocument,
  cleanupExpiredReceiptFiles,
  createUniqueReceiptFilename,
  generateReceiptPdf,
  RECEIPT_RETENTION_MS,
  type ReceiptPdfDependencies,
} from '../utils/receiptPdf';
import { Directory, File } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';

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

const mockedPdfDependencies = {
  Directory: Directory as unknown as typeof Directory,
  File: File as unknown as typeof File,
  Paths: {
    cache: 'file:///cache/',
  } as unknown as ReceiptPdfDependencies['Paths'],
  printToFileAsync,
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

test('creates a unique PDF filename for every share attempt', () => {
  const first = createUniqueReceiptFilename('receipt-60001-TX-1.pdf', 1000);
  const second = createUniqueReceiptFilename('receipt-60001-TX-1.pdf', 1000);

  expect(first).not.toBe(second);
  expect(first).toMatch(/^receipt-60001-TX-1-rs-[a-z0-9]+\.pdf$/);
});

test('deletes only receipt files older than the retention window', () => {
  const now = 2 * RECEIPT_RETENTION_MS;
  const expired = {
    modificationTime: now - RECEIPT_RETENTION_MS - 1,
    delete: jest.fn(),
  };
  const current = {
    modificationTime: now - RECEIPT_RETENTION_MS,
    delete: jest.fn(),
  };
  const unreadable = { modificationTime: null, delete: jest.fn() };

  cleanupExpiredReceiptFiles([expired, current, unreadable], now);

  expect(expired.delete).toHaveBeenCalledTimes(1);
  expect(current.delete).not.toHaveBeenCalled();
  expect(unreadable.delete).not.toHaveBeenCalled();
});

test('ignores stale-file cleanup failures', () => {
  expect(() =>
    cleanupExpiredReceiptFiles(
      [
        {
          modificationTime: 0,
          delete: () => {
            throw new Error('locked');
          },
        },
      ],
      RECEIPT_RETENTION_MS + 1,
    ),
  ).not.toThrow();
});

test('persists a verified PDF in the protected receipt cache', async () => {
  const source = {
    exists: true,
    size: 256,
    delete: jest.fn(),
    copy: jest.fn(),
  };
  const destination = {
    uri: 'file:///cache/whatsapp-receipts/receipt-unique.pdf',
    exists: false,
    size: 0,
  };
  source.copy.mockImplementation(() => {
    destination.exists = true;
    destination.size = source.size;
  });
  const directory = {
    exists: false,
    create: jest.fn(function create() {
      directory.exists = true;
    }),
    list: jest.fn(() => []),
  };
  (printToFileAsync as jest.Mock).mockResolvedValueOnce({
    uri: 'file:///print-output.pdf',
  });
  (File as unknown as jest.Mock)
    .mockImplementationOnce(() => source)
    .mockImplementationOnce(() => destination);
  (Directory as unknown as jest.Mock).mockImplementationOnce(() => directory);

  await expect(
    generateReceiptPdf(receipt, mockedPdfDependencies),
  ).resolves.toEqual({
    uri: destination.uri,
    filename: expect.stringMatching(/^receipt-60001-TX-1-.+\.pdf$/),
  });
  expect(directory.create).toHaveBeenCalledWith({
    idempotent: true,
    intermediates: true,
  });
  expect(source.copy).toHaveBeenCalledWith(destination);
  expect(source.delete).toHaveBeenCalledTimes(1);
});

test('rejects an empty generated PDF before opening WhatsApp', async () => {
  (printToFileAsync as jest.Mock).mockResolvedValueOnce({
    uri: 'file:///empty.pdf',
  });
  (File as unknown as jest.Mock).mockImplementationOnce(() => ({
    exists: true,
    size: 0,
  }));

  await expect(
    generateReceiptPdf(receipt, mockedPdfDependencies),
  ).rejects.toThrow(
    'generated receipt PDF is missing or empty',
  );
});
