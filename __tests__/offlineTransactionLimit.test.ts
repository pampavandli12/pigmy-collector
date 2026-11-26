import { evaluateOfflineTransactionLimit } from '../utils/offlineTransactionLimit';

test('allows offline deposits when no limit is configured', () => {
  expect(evaluateOfflineTransactionLimit(null, 5)).toEqual({
    allowed: true,
    remaining: null,
    limit: null,
  });
  expect(evaluateOfflineTransactionLimit(undefined, 5)).toEqual({
    allowed: true,
    remaining: null,
    limit: null,
  });
  expect(evaluateOfflineTransactionLimit(-1, 5)).toEqual({
    allowed: true,
    remaining: null,
    limit: null,
  });
  expect(evaluateOfflineTransactionLimit(1.5, 5)).toEqual({
    allowed: true,
    remaining: null,
    limit: null,
  });
});

test('a limit of zero blocks deposits while offline', () => {
  expect(evaluateOfflineTransactionLimit(0, 0)).toEqual({
    allowed: false,
    remaining: 0,
    limit: 0,
  });
  expect(evaluateOfflineTransactionLimit(0, 0, 1)).toEqual({
    allowed: false,
    remaining: 0,
    limit: 0,
  });
});

test('a limit of zero allows deposits while online with no unsynced backlog', () => {
  expect(evaluateOfflineTransactionLimit(0, 0, 0, true).allowed).toBe(true);
  expect(evaluateOfflineTransactionLimit(0, 0, 1, true).allowed).toBe(true);
  // A deposit that failed to sync is still outstanding, so the cap applies.
  expect(evaluateOfflineTransactionLimit(0, 1, 1, true).allowed).toBe(false);
});

test('online, only the existing backlog counts against the limit', () => {
  expect(evaluateOfflineTransactionLimit(3, 3, 1, true).allowed).toBe(true);
  expect(evaluateOfflineTransactionLimit(3, 4, 1, true).allowed).toBe(false);
});

test('allows queuing up to the configured limit', () => {
  expect(evaluateOfflineTransactionLimit(3, 2)).toEqual({
    allowed: true,
    remaining: 1,
    limit: 3,
  });
  expect(evaluateOfflineTransactionLimit(3, 2, 1)).toEqual({
    allowed: true,
    remaining: 1,
    limit: 3,
  });
});

test('blocks queuing past the configured limit', () => {
  expect(evaluateOfflineTransactionLimit(3, 3)).toEqual({
    allowed: false,
    remaining: 0,
    limit: 3,
  });
  expect(evaluateOfflineTransactionLimit(3, 3, 1)).toEqual({
    allowed: false,
    remaining: 0,
    limit: 3,
  });
  expect(evaluateOfflineTransactionLimit(3, 2, 2)).toEqual({
    allowed: false,
    remaining: 1,
    limit: 3,
  });
});
