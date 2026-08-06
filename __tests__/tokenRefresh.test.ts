import { refreshAccessToken } from '../services/tokenRefresh';

const mockRefreshGet = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('refreshes tokens with a GET query parameter', async () => {
  mockRefreshGet.mockResolvedValue({
    data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
  });
  await expect(refreshAccessToken('old-refresh', {
    get: mockRefreshGet,
  })).resolves.toEqual({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  expect(mockRefreshGet).toHaveBeenCalledWith(
    'https://pigmymobile-api.onrender.com/pigmyMobile/v2/login/refresh',
    {
      params: { refreshToken: 'old-refresh' },
      headers: { 'Content-Type': 'application/json' },
    },
  );
});

test('rejects malformed refresh responses', async () => {
  mockRefreshGet.mockResolvedValue({ data: { accessToken: 'new-access' } });
  await expect(refreshAccessToken('old-refresh', {
    get: mockRefreshGet,
  })).rejects.toThrow();
});
