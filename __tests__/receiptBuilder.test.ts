import { buildReceiptData, parseReceiptAmount } from '../utils/receiptBuilder';

test('builds one shared receipt shape for printing and PDF generation', () => {
  const receipt = buildReceiptData({
    amount: '₹1,250.50',
    customerId: '2053',
    accountNumber: '60001',
    date: 'July 30, 2026',
    scheme: 'Pigmy Deposit',
    customerName: 'Customer',
    openingBalance: 900,
    totalBalance: 2150.5,
    bankName: 'Pigmy Bank',
    collectorName: 'Agent',
    collectorPhone: '9876543210',
  });

  expect(receipt).toEqual(
    expect.objectContaining({
      bankName: 'Pigmy Bank',
      customerName: 'Customer',
      accountNo: '60001',
      openingBalance: 900,
      receivedAmount: 1250.5,
      totalBalance: 2150.5,
      collectorName: 'Agent',
      collectorPhone: '9876543210',
    }),
  );
});

test('parses formatted and invalid receipt amounts safely', () => {
  expect(parseReceiptAmount('₹1,250.50')).toBe(1250.5);
  expect(parseReceiptAmount(Number.NaN)).toBe(0);
  expect(parseReceiptAmount('invalid')).toBe(0);
});
