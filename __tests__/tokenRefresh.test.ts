import { refreshAccessToken } from '../services/tokenRefresh';
import { API_BASE_URL } from '../utils/constants';

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
    `${API_BASE_URL}/pigmyMobile/v2/login/refresh`,
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
