import { refreshAccessToken } from '../services/tokenRefresh';
import { API_BASE_URL } from '../utils/constants';

const mockRefreshPost = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('refreshes tokens with a POST JSON body', async () => {
  mockRefreshPost.mockResolvedValue({
    data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
  });
  await expect(refreshAccessToken('old-refresh', '9876543210', {
    post: mockRefreshPost,
  })).resolves.toEqual({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  expect(mockRefreshPost).toHaveBeenCalledWith(
    `${API_BASE_URL}/pigmyMobile/v2/login/refresh`,
    { refreshToken: 'old-refresh', mobileNumber: '9876543210' },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
});

test('rejects malformed refresh responses', async () => {
  mockRefreshPost.mockResolvedValue({ data: { accessToken: 'new-access' } });
  await expect(refreshAccessToken('old-refresh', '9876543210', {
    post: mockRefreshPost,
  })).rejects.toThrow();
});
