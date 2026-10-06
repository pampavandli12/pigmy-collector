import { parseDepositAmount } from '../utils/depositAmount';

test('accepts plain positive amounts with up to two decimal places', () => {
  expect(parseDepositAmount('100')).toBe(100);
  expect(parseDepositAmount('100.5')).toBe(100.5);
  expect(parseDepositAmount('100.50')).toBe(100.5);
  expect(parseDepositAmount(' 250 ')).toBe(250);
});

test('rejects zero, negative, and empty input', () => {
  expect(parseDepositAmount('0')).toBeNull();
  expect(parseDepositAmount('0.00')).toBeNull();
  expect(parseDepositAmount('-5')).toBeNull();
  expect(parseDepositAmount('')).toBeNull();
  expect(parseDepositAmount('   ')).toBeNull();
});

test('rejects scientific notation even though Number() would parse it', () => {
  expect(parseDepositAmount('1e5')).toBeNull();
  expect(Number('1e5')).toBe(100000); // sanity check: Number() alone accepts this
});

test('rejects more than two decimal places', () => {
  expect(parseDepositAmount('100.999')).toBeNull();
});

test('rejects implausibly long digit strings (e.g. a bad paste)', () => {
  expect(parseDepositAmount('99999999999999999999')).toBeNull();
  expect(parseDepositAmount('9999999')).toBe(9999999); // 7 digits: still allowed
});

test('rejects non-numeric characters', () => {
  expect(parseDepositAmount('abc')).toBeNull();
  expect(parseDepositAmount('10,000')).toBeNull();
  expect(parseDepositAmount('₹100')).toBeNull();
});
