import { decodeJwtPayload, getJwtExpiryMs } from '../utils/jwt';

function base64UrlEncode(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: unknown): string {
  return `${base64UrlEncode({ alg: 'HS256' })}.${base64UrlEncode(payload)}.signature`;
}

test('decodes a valid JWT payload', () => {
  const token = makeToken({ sub: '123', exp: 1788369468 });
  expect(decodeJwtPayload(token)).toEqual({ sub: '123', exp: 1788369468 });
});

test('returns the exp claim in milliseconds', () => {
  const token = makeToken({ exp: 1788369468 });
  expect(getJwtExpiryMs(token)).toBe(1788369468 * 1000);
});

test('returns null for a token with the wrong number of segments', () => {
  expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  expect(decodeJwtPayload('a.b.c.d')).toBeNull();
});

test('returns null for a payload segment that is not valid base64/JSON', () => {
  expect(decodeJwtPayload('header.%%%not-base64%%%.sig')).toBeNull();
});

test('returns null exp when the claim is missing or non-numeric', () => {
  expect(getJwtExpiryMs(makeToken({ sub: '123' }))).toBeNull();
  expect(getJwtExpiryMs(makeToken({ exp: 'soon' }))).toBeNull();
});

test('returns null exp for an undecodable token', () => {
  expect(getJwtExpiryMs('garbage')).toBeNull();
});
