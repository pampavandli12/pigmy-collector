// services/axios.ts calls axios.create(...) at import time; the real axios
// module's fetch-adapter lookup crashes under this Jest/Node setup (unrelated
// to this app's code), so axios.create is stubbed out here too.
jest.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    request: jest.fn(),
  };
  const axiosMock = { create: jest.fn(() => mockInstance) };
  return { __esModule: true, default: axiosMock, ...axiosMock };
});
jest.mock('../services/authStorage', () => ({
  getStoredAuthContext: jest.fn(),
}));
jest.mock('../services/authRefresh', () => ({
  ensureFreshAccessToken: jest.fn(),
  handleUnauthorizedResponse: jest.fn(),
}));

import { ensureFreshAccessToken } from '../services/authRefresh';
import { getStoredAuthContext } from '../services/authStorage';
import { resolveRequestAuth } from '../services/axios';

const mockGetStoredAuthContext = getStoredAuthContext as jest.Mock;
const mockEnsureFreshAccessToken = ensureFreshAccessToken as jest.Mock;

beforeEach(() => {
  mockGetStoredAuthContext.mockReset();
  mockEnsureFreshAccessToken.mockReset();
});

test('skips the check entirely for a public auth route', async () => {
  const config = { headers: {}, url: '/pigmyMobile/v2/login' };
  const resolved = await resolveRequestAuth(config as never);
  expect(resolved._authHeadersResolved).toBe(true);
  expect(resolved.headers).not.toHaveProperty('Authorization');
  expect(mockGetStoredAuthContext).not.toHaveBeenCalled();
  expect(mockEnsureFreshAccessToken).not.toHaveBeenCalled();
});

test('passes an already-resolved config through unchanged', async () => {
  const config = {
    headers: { Authorization: 'kept' },
    url: '/pigmyMobile/v2/user',
    _authHeadersResolved: true,
  };
  const resolved = await resolveRequestAuth(config as never);
  expect(resolved.headers.Authorization).toBe('kept');
  expect(mockGetStoredAuthContext).not.toHaveBeenCalled();
  expect(mockEnsureFreshAccessToken).not.toHaveBeenCalled();
});

test('resolves a token via ensureFreshAccessToken and applies it to the headers', async () => {
  mockGetStoredAuthContext.mockResolvedValue({
    token: 'old-access',
    accountId: 'B:1',
    bankType: 'peocit',
  });
  mockEnsureFreshAccessToken.mockResolvedValue({ status: 'ready', token: 'fresh-access' });

  const config = { headers: {}, url: '/pigmyMobile/v2/user' };
  const resolved = await resolveRequestAuth(config as never);

  expect(mockEnsureFreshAccessToken).toHaveBeenCalledWith('B:1');
  expect(resolved.headers.Authorization).toBe('fresh-access');
  expect(resolved.headers.bankType).toBe('peocit');
  expect(resolved._agentAccountId).toBe('B:1');
  expect(resolved._authHeadersResolved).toBe(true);
});

test('rejects the request before sending when the session has ended', async () => {
  mockGetStoredAuthContext.mockResolvedValue({
    token: 'old-access',
    accountId: 'B:1',
    bankType: 'peocit',
  });
  mockEnsureFreshAccessToken.mockResolvedValue({ status: 'sessionEnded' });

  const config = { headers: {}, url: '/pigmyMobile/v2/user' };
  await expect(resolveRequestAuth(config as never)).rejects.toThrow(
    'Your session has expired. Please log in again.',
  );
});

test('applies no auth header when nothing is stored', async () => {
  mockGetStoredAuthContext.mockResolvedValue(null);

  const config = { headers: {}, url: '/pigmyMobile/v2/user' };
  const resolved = await resolveRequestAuth(config as never);

  expect(resolved.headers).not.toHaveProperty('Authorization');
  expect(mockEnsureFreshAccessToken).not.toHaveBeenCalled();
});
