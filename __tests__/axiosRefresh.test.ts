const mockGetStoredAccountUser = jest.fn();
const mockUpdateStoredTokensForAccount = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockNotifyAuthUserUpdated = jest.fn();
const mockEndSession = jest.fn();
const mockApiRequest = jest.fn();

import { handleAuthResponseError } from '../services/authRefresh';

const oldUser = {
  agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
  phoneNumber: '9876543210', lastDepositDate: null, limitAmount: null,
  graceDays: null, accessToken: 'old-access', refreshToken: 'old-refresh',
};
const newUser = {
  ...oldUser,
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
};

const handleResponseError = (status: number, config: Record<string, unknown>) => {
  return handleAuthResponseError(
    {
      config: { ...config, _agentAccountId: 'B:1' } as never,
      response: { status },
    },
    mockApiRequest,
    {
      getStoredAccountUser: mockGetStoredAccountUser,
      refreshAccessToken: mockRefreshAccessToken,
      updateStoredTokensForAccount: mockUpdateStoredTokensForAccount,
      notifyAuthUserUpdated: mockNotifyAuthUserUpdated,
      endSession: mockEndSession,
    },
  );
};

beforeEach(() => {
  [
    mockGetStoredAccountUser,
    mockUpdateStoredTokensForAccount,
    mockRefreshAccessToken,
    mockNotifyAuthUserUpdated,
    mockEndSession,
    mockApiRequest,
  ].forEach((mock) => mock.mockReset());
  mockGetStoredAccountUser.mockResolvedValue(oldUser);
  mockRefreshAccessToken.mockResolvedValue({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  mockUpdateStoredTokensForAccount.mockImplementation(() => {
    return Promise.resolve(newUser);
  });
  mockEndSession.mockResolvedValue(undefined);
  mockApiRequest.mockResolvedValue({ data: { ok: true } });
});

test('refreshes on 401, updates auth state, and replays with the new token', async () => {
  const config = { headers: { Authorization: 'old-access' }, url: '/protected' };
  await expect(handleResponseError(401, config)).resolves.toMatchObject({
    data: { ok: true },
  });
  expect(mockRefreshAccessToken).toHaveBeenCalledWith('old-refresh');
  expect(mockUpdateStoredTokensForAccount).toHaveBeenCalledWith('B:1', {
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  expect(mockNotifyAuthUserUpdated).toHaveBeenCalledWith('B:1', newUser);
  expect(mockApiRequest).toHaveBeenCalledTimes(1);
  expect(mockApiRequest.mock.calls[0][0].headers.Authorization).toBe('new-access');
});

test('shares one refresh across concurrent 401 responses', async () => {
  await Promise.all([
    handleResponseError(401, { headers: {}, url: '/first' }),
    handleResponseError(401, { headers: {}, url: '/second' }),
  ]);
  expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
  expect(mockApiRequest).toHaveBeenCalledTimes(2);
});

test('logs out on 403 without refreshing', async () => {
  await expect(handleResponseError(403, { headers: {} })).rejects.toMatchObject({
    response: { status: 403 },
  });
  expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  expect(mockEndSession).toHaveBeenCalled();
  expect(mockEndSession).toHaveBeenCalledWith('B:1');
});

test('logs out when refresh is unavailable', async () => {
  mockGetStoredAccountUser.mockResolvedValue({ ...oldUser, refreshToken: null });
  await expect(handleResponseError(401, { headers: {} })).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  expect(mockEndSession).toHaveBeenCalled();
});

test('does not refresh a replayed request twice', async () => {
  await expect(handleResponseError(401, {
    headers: {},
    _tokenRefreshAttempted: true,
  })).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  expect(mockEndSession).toHaveBeenCalled();
});

test('does not log out when the replay fails for a non-auth reason', async () => {
  const replayError = { response: { status: 500 } };
  mockApiRequest.mockRejectedValue(replayError);
  await expect(handleResponseError(401, { headers: {} })).rejects.toBe(
    replayError,
  );
  expect(mockEndSession).not.toHaveBeenCalled();
});
