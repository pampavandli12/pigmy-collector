import assert from 'node:assert/strict';
import {
  isValidOutboxItem,
  shouldRemoveOutboxItem,
} from '../store/outboxPolicy';
import { OutboxItem } from '../types/user';

const now = new Date(2026, 6, 18, 12).getTime();
const previousDay = new Date(2026, 6, 17, 23, 59, 59, 999).getTime();
const startOfToday = new Date(2026, 6, 18, 0, 0, 0, 0).getTime();

function item(status: OutboxItem['status'], createdAt: number): OutboxItem {
  return {
    status,
    createdAt,
    retryCount: 0,
    payload: {
      transactionId: 'tx-1',
      userId: 1,
      agentCode: 2,
      bankCode: 'bank',
      collectedAmount: 100,
      schemename: 'Pigmy Deposit',
      collectiontype: 'cash',
      customerName: 'Customer',
      accountNumber: 3,
    },
  };
}

test('removes every transaction status from previous calendar days', () => {
  for (const status of ['pending', 'syncing', 'failed', 'synced'] as const) {
    assert.equal(
      shouldRemoveOutboxItem(item(status, previousDay), now),
      true,
    );
  }
});

test('keeps transactions created at local midnight or later today', () => {
  assert.equal(
    shouldRemoveOutboxItem(item('pending', startOfToday), now),
    false,
  );
});

test('removes malformed persisted entries that cannot be synchronized', () => {
  const malformed = {
    status: 'failed',
    retryCount: 4,
    error: 'Network Error',
  };

  assert.equal(isValidOutboxItem(malformed), false);
  assert.equal(shouldRemoveOutboxItem(malformed, now), true);
});
