import assert from 'node:assert/strict';
import { getErrorMessage } from '../utils/errors';

test('returns a useful Error message', () => {
  assert.equal(getErrorMessage(new Error('Printer unavailable'), 'Fallback'), 'Printer unavailable');
});

test('uses the fallback for unknown or empty errors', () => {
  assert.equal(getErrorMessage('failure', 'Fallback'), 'Fallback');
  assert.equal(getErrorMessage(new Error(''), 'Fallback'), 'Fallback');
});
