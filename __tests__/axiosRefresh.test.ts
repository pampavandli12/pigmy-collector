const mockGetStoredAccountUser = jest.fn();
const mockUpdateStoredTokensForAccount = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockNotifyAuthUserUpdated = jest.fn();
const mockEndSession = jest.fn();

import {
  ensureFreshAccessToken,
  handleUnauthorizedResponse,
  PROACTIVE_REFRESH_THRESHOLD_MS,
} from '../services/authRefresh';

function base64UrlEncode(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(expSecondsFromNow: number): string {
  const header = base64UrlEncode({ alg: 'HS256' });
  const payload = base64UrlEncode({
    sub: '9876543210',
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  });
  return `${header}.${payload}.signature`;
}

const ACCOUNT_ID = 'B:1';

const baseUser = {
  agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
  phoneNumber: '9876543210', lastDepositDate: null, limitAmount: null,
  graceDays: null, refreshToken: 'old-refresh', bankType: 'peocit', schemes: [],
};

const dependencies = () => ({
  getStoredAccountUser: mockGetStoredAccountUser,
  refreshAccessToken: mockRefreshAccessToken,
  updateStoredTokensForAccount: mockUpdateStoredTokensForAccount,
  notifyAuthUserUpdated: mockNotifyAuthUserUpdated,
  endSession: mockEndSession,
});

beforeEach(() => {
  [
    mockGetStoredAccountUser,
    mockUpdateStoredTokensForAccount,
    mockRefreshAccessToken,
    mockNotifyAuthUserUpdated,
    mockEndSession,
  ].forEach((mock) => mock.mockReset());
  mockRefreshAccessToken.mockResolvedValue({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  mockUpdateStoredTokensForAccount.mockImplementation(() =>
    Promise.resolve({ ...baseUser, accessToken: 'new-access', refreshToken: 'new-refresh' }),
  );
  mockEndSession.mockResolvedValue(undefined);
});

describe('ensureFreshAccessToken', () => {
  test('returns the existing token unchanged when it is far from expiring', async () => {
    const token = makeToken(3600);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token,
    });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  test('refreshes when the token is expiring within the threshold', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token: 'new-access',
    });
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('old-refresh', '9876543210');
    expect(mockNotifyAuthUserUpdated).toHaveBeenCalled();
  });

  test('refreshes when the token is already expired', async () => {
    const token = makeToken(-60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token: 'new-access',
    });
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
  });

  test('refreshes defensively when the token cannot be decoded as a JWT', async () => {
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: 'not-a-jwt' });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token: 'new-access',
    });
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
  });

  test('shares one refresh across concurrent calls for the same account', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });

    const deps = dependencies();
    await Promise.all([
      ensureFreshAccessToken(ACCOUNT_ID, deps),
      ensureFreshAccessToken(ACCOUNT_ID, deps),
    ]);
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
  });

  test('keeps the old token and does not end the session on a transient refresh failure', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });
    mockRefreshAccessToken.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token,
    });
    expect(mockEndSession).not.toHaveBeenCalled();
  });

  test('ends the session when the server rejects the refresh token', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });
    mockRefreshAccessToken.mockRejectedValue({ response: { status: 401 } });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'sessionEnded',
    });
    expect(mockEndSession).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('ends the session when no refresh token is stored', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({
      ...baseUser,
      accessToken: token,
      refreshToken: null,
    });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'sessionEnded',
    });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(mockEndSession).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('ends the session when the refreshed account does not match the requested account', async () => {
    const token = makeToken(60);
    mockGetStoredAccountUser.mockResolvedValue({ ...baseUser, accessToken: token });
    mockUpdateStoredTokensForAccount.mockResolvedValue({
      ...baseUser,
      agentCode: 2,
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'sessionEnded',
    });
    expect(mockEndSession).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('returns ready with an empty token when nothing is stored for the account', async () => {
    mockGetStoredAccountUser.mockResolvedValue(null);

    await expect(ensureFreshAccessToken(ACCOUNT_ID, dependencies())).resolves.toEqual({
      status: 'ready',
      token: '',
    });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(mockEndSession).not.toHaveBeenCalled();
  });

  test('threshold is 15 minutes', () => {
    expect(PROACTIVE_REFRESH_THRESHOLD_MS).toBe(15 * 60 * 1000);
  });
});

describe('handleUnauthorizedResponse', () => {
  test('ends the session on 401', async () => {
    const error = { config: { _agentAccountId: ACCOUNT_ID, headers: {} }, response: { status: 401 } };
    await expect(
      handleUnauthorizedResponse(error, { endSession: mockEndSession }),
    ).rejects.toBe(error);
    expect(mockEndSession).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('does not end the session on 403', async () => {
    const error = { config: { _agentAccountId: ACCOUNT_ID, headers: {} }, response: { status: 403 } };
    await expect(
      handleUnauthorizedResponse(error, { endSession: mockEndSession }),
    ).rejects.toBe(error);
    expect(mockEndSession).not.toHaveBeenCalled();
  });

  test('does not end the session when the request has no account id', async () => {
    const error = { config: { headers: {} }, response: { status: 401 } };
    await expect(
      handleUnauthorizedResponse(error, { endSession: mockEndSession }),
    ).rejects.toBe(error);
    expect(mockEndSession).not.toHaveBeenCalled();
  });
});
