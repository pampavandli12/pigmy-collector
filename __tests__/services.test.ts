jest.mock('../services/axios', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

import { api } from '../services/axios';
import { userLogin } from '../services/login';
import { createTransaction, fetchCustomers } from '../services/user';

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

test('posts normalized login credentials', async () => {
  mockedApi.post.mockResolvedValueOnce({ data: {
    agentName: 'Agent', agentCode: 11, bankCode: 'AGT123', bankName: 'Bank Name',
    phoneNumber: '9876543210', lastDepositDate: '2026-06-19', limitAmount: 50000,
    graceDays: 0, refreshToken: 'refresh-token', accessToken: 'access-token',
  } });
  await expect(userLogin('9876543210', 'secret')).resolves.toEqual({
    agentName: 'Agent', agentCode: 11, bankCode: 'AGT123', bankName: 'Bank Name',
    phoneNumber: '9876543210', lastDepositDate: '2026-06-19', limitAmount: 50000,
    graceDays: 0, refreshToken: 'refresh-token', accessToken: 'access-token',
  });
  expect(mockedApi.post).toHaveBeenCalledWith('/pigmyMobile/v2/login', {
    mobileNumber: '9876543210',
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
