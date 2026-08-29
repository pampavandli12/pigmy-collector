import { evaluateGracePeriod } from '../utils/gracePeriod';

test('allows the deposit date plus all configured grace calendar days', () => {
  expect(
    evaluateGracePeriod('2026-08-01', 3, new Date(2026, 7, 4, 23, 59)),
  ).toMatchObject({ allowed: true });
  expect(
    evaluateGracePeriod('2026-08-01', 3, new Date(2026, 7, 5, 0, 0)),
  ).toMatchObject({ allowed: false });
});

test('supports DD-MM-YYYY and ISO timestamps as local calendar dates', () => {
  expect(
    evaluateGracePeriod('01-08-2026', 3, new Date(2026, 7, 4)),
  ).toMatchObject({ allowed: true });
  expect(
    evaluateGracePeriod('2026-08-01T23:30:00.000Z', 3, new Date(2026, 7, 4)),
  ).toMatchObject({ allowed: true });
});

test('allows only the deposit date when graceDays is zero', () => {
  expect(
    evaluateGracePeriod('2026-08-01', 0, new Date(2026, 7, 1)),
  ).toMatchObject({ allowed: true });
  expect(
    evaluateGracePeriod('2026-08-01', 0, new Date(2026, 7, 2)),
  ).toMatchObject({ allowed: false });
});

test('handles month and year rollover', () => {
  const result = evaluateGracePeriod(
    '2026-12-31',
    2,
    new Date(2027, 0, 2),
  );

  expect(result.allowed).toBe(true);
  expect(result.deadline).toEqual(new Date(2027, 0, 2));
});

test.each([
  [null, 3],
  ['invalid', 3],
  ['2026-02-30', 3],
  ['2026-08-01', null],
  ['2026-08-01', -1],
  ['2026-08-01', 1.5],
] as const)('blocks invalid or missing grace data', (date, graceDays) => {
  expect(evaluateGracePeriod(date, graceDays, new Date(2026, 7, 1))).toEqual({
    allowed: false,
    deadline: null,
  });
});
