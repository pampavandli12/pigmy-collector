import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBankReceipt,
  formatReceiptAmount,
  RECEIPT_CHAR_WIDTH,
  RECEIPT_SEPARATOR,
} from '../utils/receiptFormatter';

const baseReceipt = {
  bankName: 'Pigmy Cooperative Bank',
  receiptTitle: 'Receipt',
  date: '17-07-2026',
  time: '14:35',
  customerName: 'SRIRAM S',
  accountNo: '60001',
  accountOpeningDate: '01-04-2024',
  openingBalance: 12500,
  receivedAmount: 255,
  totalBalance: 12755,
  amountInWords: 'Two Hundred Fifty Five Rupees Only',
  collectorName: 'Ramesh Kumar',
  collectorPhone: '9876543210',
};

function renderedLines(receipt: string) {
  return receipt.trimEnd().split('\n');
}

function assertNoOverflow(receipt: string) {
  renderedLines(receipt).forEach((line) => {
    assert.ok(
      line.length <= RECEIPT_CHAR_WIDTH,
      `Expected "${line}" to fit ${RECEIPT_CHAR_WIDTH} chars, got ${line.length}`,
    );
  });
}

test('formats a normal bank receipt without MSA or receipt number', () => {
  const receipt = formatBankReceipt(baseReceipt);

  assert.match(receipt, /Pigmy Cooperative Bank/);
  assert.match(receipt, /Receipt/);
  assert.match(receipt, /Date:17-07-2026\s+Time:14:35/);
  assert.match(receipt, /Customer: SRIRAM S/);
  assert.match(receipt, /Account No: 60001/);
  assert.match(receipt, /Opened On: 01-04-2024/);
  assert.match(receipt, /Opening Bal:\s+Rs\. 12,500\.00/);
  assert.match(receipt, /Received:\s+Rs\. 255\.00/);
  assert.match(receipt, /Total Bal:\s+Rs\. 12,755\.00/);
  assert.match(receipt, /Amount in words:/);
  assert.match(receipt, /Two Hundred Fifty Five Rupees/);
  assert.match(receipt, /Collector: Ramesh Kumar/);
  assert.match(receipt, /Phone: 9876543210/);
  assert.match(receipt, /Thank You/);
  assert.doesNotMatch(receipt, /MSA/i);
  assert.doesNotMatch(receipt, /Receipt #|receiptNumber|TX-/);
  assertNoOverflow(receipt);
});

test('wraps a long bank name safely', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    bankName: 'Sri Lakshmi Venkateshwara Urban Cooperative Bank Ltd',
  });

  assert.match(receipt, /Sri Lakshmi Venkateshwara/);
  assert.match(receipt, /Cooperative Bank Ltd/);
  assertNoOverflow(receipt);
});

test('wraps a long customer name safely', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    customerName: 'SRIKANTH VENKATESH NARAYANASWAMY',
  });

  assert.match(receipt, /Customer/);
  assert.match(receipt, /SRIKANTH VENKATESH/);
  assert.match(receipt, /NARAYANASWAMY/);
  assertNoOverflow(receipt);
});

test('formats zero opening balance', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    openingBalance: 0,
    receivedAmount: 255,
    totalBalance: 255,
  });

  assert.match(receipt, /Opening Bal:\s+Rs\. 0\.00/);
  assert.match(receipt, /Total Bal:\s+Rs\. 255\.00/);
  assertNoOverflow(receipt);
});

test('formats large amounts with Indian grouping', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    openingBalance: 1234567.5,
    receivedAmount: 25000,
    totalBalance: 1259567.5,
  });

  assert.match(receipt, /Rs\. 12,34,567\.50/);
  assert.match(receipt, /Rs\. 25,000\.00/);
  assert.match(receipt, /Rs\. 12,59,567\.50/);
  assert.equal(formatReceiptAmount('12345678.9'), 'Rs. 1,23,45,678.90');
  assertNoOverflow(receipt);
});

test('omits missing collector phone without unsafe placeholders', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    collectorPhone: undefined,
  });

  assert.doesNotMatch(receipt, /^Phone:/m);
  assert.doesNotMatch(receipt, /undefined|null|NaN/);
  assertNoOverflow(receipt);
});

test('handles malformed numeric input without printing NaN', () => {
  const receipt = formatBankReceipt({
    ...baseReceipt,
    openingBalance: 'not-a-number',
    receivedAmount: Number.NaN,
    totalBalance: null,
  });

  assert.doesNotMatch(receipt, /Opening Bal:/);
  assert.doesNotMatch(receipt, /Received:/);
  assert.doesNotMatch(receipt, /Total Bal:/);
  assert.doesNotMatch(receipt, /NaN|undefined|null/);
  assertNoOverflow(receipt);
});

test('allows exact maximum-width lines', () => {
  const exactLine = 'Account No: 12345678901234567890';
  assert.equal(exactLine.length, RECEIPT_CHAR_WIDTH);

  const receipt = formatBankReceipt({
    ...baseReceipt,
    accountNo: '12345678901234567890',
  });

  assert.ok(renderedLines(receipt).includes(exactLine));
  assert.ok(renderedLines(receipt).includes(RECEIPT_SEPARATOR));
  assertNoOverflow(receipt);
});
