jest.mock('../services/axios', () => ({
  api: { get: jest.fn() },
}));

import { api } from '../services/axios';
import { authenticateAgent } from '../services/authenticate';
import { authenticateMeResponseSchema } from '../types/auth';

const mockedApi = api as jest.Mocked<typeof api>;

const authenticateResponse = {
  limitAmount: 50000,
  isAgentRevoked: false,
  lastDepositDate: '2026-06-19',
  graceDays: 0,
};

beforeEach(() => jest.clearAllMocks());

test('parses the authenticate-me response shape', () => {
  expect(authenticateMeResponseSchema.parse(authenticateResponse)).toEqual(
    authenticateResponse,
  );
});

test('fetches agent status with the stored phone number', async () => {
  mockedApi.get.mockResolvedValueOnce({ data: authenticateResponse });

  await expect(authenticateAgent('9738115260')).resolves.toEqual(
    authenticateResponse,
  );
  expect(mockedApi.get).toHaveBeenCalledWith(
    '/pigmyMobile/v2/login/authenticate',
    { params: { phoneNumber: '9738115260' } },
  );
});

test('rejects malformed authenticate-me responses', async () => {
  mockedApi.get.mockResolvedValueOnce({
    data: { limitAmount: 50000, isAgentRevoked: false },
  });
  await expect(authenticateAgent('9738115260')).rejects.toThrow();
});
