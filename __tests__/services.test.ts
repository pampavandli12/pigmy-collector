jest.mock('../services/axios', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

import { api } from '../services/axios';
import { userLogin } from '../services/login';
import { createTransaction, fetchCollections, fetchCustomers } from '../services/user';
import { loginResponseSchema } from '../types/auth';

const mockedApi = api as jest.Mocked<typeof api>;

const latestLoginResponse = {
  agentName: 'suresh',
  agentCode: 3,
  bankCode: 'AGT123',
  bankName: 'Vijayanagara Cooperative Bank',
  phoneNumber: '9110803870',
  lastDepositDate: '2026-08-06',
  limitAmount: 50000,
  graceDays: 0,
  refreshToken:
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5MTEwODAzODcwIiwiaWF0IjoxNzg4MzY5MTY4LCJleHAiOjE3ODgzNjk1Njh9.N0pxDQlTwzj0RXXJXaY82Kg0aEVWi8DePJ-CVGoHj98',
  accessToken:
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5MTEwODAzODcwIiwiaWF0IjoxNzg4MzY5MTY4LCJleHAiOjE3ODgzNjk0Njh9.hk9TRrLPmv7Mji9qPwck47iosm799PJjm7qreb4IIQk',
};

beforeEach(() => jest.clearAllMocks());

test('parses the latest login API response shape', () => {
  expect(loginResponseSchema.parse(latestLoginResponse)).toEqual(
    latestLoginResponse,
  );
});

test('posts normalized login credentials', async () => {
  mockedApi.post.mockResolvedValueOnce({ data: latestLoginResponse });
  await expect(userLogin('9110803870', 'secret')).resolves.toEqual(
    latestLoginResponse,
  );
  expect(mockedApi.post).toHaveBeenCalledWith('/pigmyMobile/v2/login', {
    mobileNumber: '9110803870',
    password: 'secret',
  });
});

test('rejects an incomplete login response', async () => {
  mockedApi.post.mockResolvedValueOnce({ data: { accessToken: 'token' } });
  await expect(userLogin('9876543210', 'secret')).rejects.toThrow();
});

test('fetches customers with agent and bank parameters', async () => {
  mockedApi.get.mockResolvedValueOnce({ data: [] });
  await expect(fetchCustomers({ agentCode: 7, bankCode: 'B1' })).resolves.toEqual([]);
  expect(mockedApi.get).toHaveBeenCalledWith('/pigmyMobile/v2/user', {
    params: { agentCode: 7, bankCode: 'B1' },
  });
});

test('fetches collection summary with agent, bank, and grace day parameters', async () => {
  mockedApi.get.mockResolvedValueOnce({
    data: { totalTransactions: 1, totalAmountCollected: 1500 },
  });
  await expect(
    fetchCollections({ agentCode: 11, bankCode: 'AGT123', graceDays: 2 }),
  ).resolves.toEqual({
    totalTransactions: 1,
    totalAmountCollected: 1500,
  });
  expect(mockedApi.get).toHaveBeenCalledWith(
    '/pigmyMobile/v2/transaction/fetchCollections',
    { params: { agentCode: 11, bankCode: 'AGT123', graceDays: 2 } },
  );
});

test('posts transactions unchanged', async () => {
  const payload = {
    transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
    collectedAmount: 100, schemename: 'Pigmy Deposit', collectiontype: 'cash',
    customerName: 'Customer', accountNumber: 3,
  };
  mockedApi.post.mockResolvedValueOnce({ data: { ok: true } });
  await expect(createTransaction(payload)).resolves.toEqual({ ok: true });
  expect(mockedApi.post).toHaveBeenCalledWith('/pigmyMobile/v2/transaction', payload);
});
