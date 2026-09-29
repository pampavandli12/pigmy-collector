import { applyAuthHeaders } from '../services/requestAuthHeaders';

test('attaches Authorization and bankType headers when authenticated', () => {
  const headers: Record<string, string | undefined> = {};
  applyAuthHeaders(headers, {
    token: 'secret-token',
    accountId: 'B:1',
    bankType: 'peocit',
  });
  expect(headers.Authorization).toBe('secret-token');
  expect(headers.bankType).toBe('peocit');
});

test('omits the bankType header when no bank type is stored', () => {
  const headers: Record<string, string | undefined> = {};
  applyAuthHeaders(headers, { token: 'secret-token', accountId: 'B:1' });
  expect(headers.Authorization).toBe('secret-token');
  expect(headers.bankType).toBeUndefined();
});

test('clears stale headers for public routes or when no session is stored', () => {
  const headers: Record<string, string | undefined> = {
    Authorization: 'stale',
    bankType: 'stale',
  };
  applyAuthHeaders(headers, null);
  expect(headers.Authorization).toBeUndefined();
  expect(headers.bankType).toBeUndefined();
});
