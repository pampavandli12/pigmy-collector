import { evaluateCollectionLimit } from '../utils/collectionLimit';

test('allows collections when no limit is configured', () => {
  expect(evaluateCollectionLimit(null, 10000, 5000)).toEqual({
    allowed: true,
    remaining: null,
    limitAmount: null,
  });
  expect(evaluateCollectionLimit(undefined, 10000)).toEqual({
    allowed: true,
    remaining: null,
    limitAmount: null,
  });
});

test('allows collections up to the configured daily limit', () => {
  expect(evaluateCollectionLimit(50000, 0, 50000)).toEqual({
    allowed: true,
    remaining: 50000,
    limitAmount: 50000,
  });
  expect(evaluateCollectionLimit(50000, 49000, 1000)).toEqual({
    allowed: true,
    remaining: 1000,
    limitAmount: 50000,
  });
});

test('blocks collections that exceed the configured daily limit', () => {
  expect(evaluateCollectionLimit(50000, 50000)).toEqual({
    allowed: false,
    remaining: 0,
    limitAmount: 50000,
  });
  expect(evaluateCollectionLimit(50000, 49000, 1001)).toEqual({
    allowed: false,
    remaining: 1000,
    limitAmount: 50000,
  });
});

test('treats invalid limits as unlimited', () => {
  expect(evaluateCollectionLimit(-1, 1000)).toEqual({
    allowed: true,
    remaining: null,
    limitAmount: null,
  });
});
