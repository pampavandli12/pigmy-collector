jest.mock('../services/axios', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

import { api } from '../services/axios';
import { userLogin } from '../services/login';
import { banksoftAdapter } from '../services/banks/banksoft';
import { peocitAdapter } from '../services/banks/peocit';
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
  bankType: 'peocit',
  schemes: [{ schemeID: '38', schemeName: 'Pigmy Deposit' }],
  refreshToken:
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5MTEwODAzODcwIiwiaWF0IjoxNzg4MzY5MTY4LCJleHAiOjE3ODgzNjk1Njh9.N0pxDQlTwzj0RXXJXaY82Kg0aEVWi8DePJ-CVGoHj98',
  accessToken:
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5MTEwODAzODcwIiwiaWF0IjoxNzg4MzY5MTY4LCJleHAiOjE3ODgzNjk0Njh9.hk9TRrLPmv7Mji9qPwck47iosm799PJjm7qreb4IIQk',
};

beforeEach(() => jest.clearAllMocks());

const storedLoginUser = {
  ...latestLoginResponse,
  schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
};

test('parses the latest login API response shape', () => {
  expect(loginResponseSchema.parse(latestLoginResponse)).toEqual(storedLoginUser);
});

test('posts normalized login credentials', async () => {
  mockedApi.post.mockResolvedValueOnce({ data: latestLoginResponse });
  await expect(userLogin('9110803870', 'secret')).resolves.toEqual(
    storedLoginUser,
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

test('skips malformed customer records instead of failing the whole list', async () => {
  const validCustomer = {
    accountNumber: 2,
    customerName: 'Valid Customer',
    currentBalance: 100,
    lastDepositDate: '2026-08-01',
    schemeId: 'S1',
    agentCode: 7,
    bankCode: 'B1',
    mobilenumber: '9876543210',
    userId: 42,
  };
  // One malformed record (missing required fields) must not blank the list — the
  // valid record is still returned.
  mockedApi.get.mockResolvedValueOnce({
    data: [{ accountNumber: 1 }, validCustomer],
  });
  await expect(
    fetchCustomers({ agentCode: 7, bankCode: 'B1' }),
  ).resolves.toEqual([validCustomer]);
});

test('sends the stored bank type when fetching customers', async () => {
  const { getItemAsync } = jest.requireMock('expo-secure-store') as {
    getItemAsync: jest.Mock;
  };
  getItemAsync.mockImplementation((key: string) =>
    Promise.resolve(
      key === 'userInfo' ? JSON.stringify(storedLoginUser) : null,
    ),
  );
  mockedApi.get.mockResolvedValueOnce({ data: [] });
  await fetchCustomers({ agentCode: 7, bankCode: 'B1' });
  expect(mockedApi.get).toHaveBeenCalledWith('/pigmyMobile/v2/user', {
    params: { agentCode: 7, bankCode: 'B1' },
    headers: { bankType: 'peocit' },
  });
});

test('fetches collection summary with agent, bank, and grace day parameters', async () => {
  const { getItemAsync } = jest.requireMock('expo-secure-store') as {
    getItemAsync: jest.Mock;
  };
  getItemAsync.mockResolvedValue(null);
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

test('sends the stored bank type when fetching collections', async () => {
  const { getItemAsync } = jest.requireMock('expo-secure-store') as {
    getItemAsync: jest.Mock;
  };
  getItemAsync.mockImplementation((key: string) =>
    Promise.resolve(
      key === 'userInfo' ? JSON.stringify(storedLoginUser) : null,
    ),
  );
  mockedApi.get.mockResolvedValueOnce({
    data: { totalTransactions: 1, totalAmountCollected: 1500 },
  });
  await fetchCollections({ agentCode: 11, bankCode: 'AGT123', graceDays: 2 });
  expect(mockedApi.get).toHaveBeenCalledWith(
    '/pigmyMobile/v2/transaction/fetchCollections',
    {
      params: { agentCode: 11, bankCode: 'AGT123', graceDays: 2 },
      headers: { bankType: 'peocit' },
    },
  );
});

test('builds a peocit payload with final amount and a banksoft payload without it', () => {
  const draft = {
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B1',
    collectedAmount: 1500,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 101,
    openingBalance: 500,
    agentName: 'Agent',
  };

  expect(peocitAdapter.buildPayload(draft)).toEqual({
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B1',
    collectedAmount: 1500,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 101,
    bankType: 'peocit',
    agentName: 'Agent',
    finalAmount: 2000,
  });

  const banksoftPayload = banksoftAdapter.buildPayload(draft);
  expect(banksoftPayload).toEqual({
    transactionId: 'tx',
    userId: 1,
    agentCode: 2,
    bankCode: 'B1',
    collectedAmount: 1500,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 101,
    bankType: 'banksoft',
  });
  expect(banksoftPayload).not.toHaveProperty('finalAmount');
  expect(banksoftPayload).not.toHaveProperty('agentName');
});

test('posts banksoft transactions with scheme id and without peocit fields', async () => {
  const payload = {
    transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
    collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38', collectiontype: 'cash',
    customerName: 'Customer', accountNumber: 3,
    bankType: 'banksoft', agentName: 'Agent', finalAmount: 250,
  };
  mockedApi.post.mockResolvedValueOnce({ data: { ok: true } });
  await expect(createTransaction(payload)).resolves.toEqual({ ok: true });
  expect(mockedApi.post).toHaveBeenCalledWith('/pigmyMobile/v2/transaction', {
    userId: 1,
    agentCode: 2,
    bankCode: 'B1',
    collectedAmount: 100,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer',
    accountNumber: 3,
    transactionId: 'tx',
  });
});

test('posts older transactions without a bank type to the banksoft endpoint', async () => {
  const payload = {
    transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
    collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38', collectiontype: 'cash',
    customerName: 'Customer', accountNumber: 3,
  };
  mockedApi.post.mockResolvedValueOnce({ data: { ok: true } });
  await createTransaction(payload);
  expect(mockedApi.post).toHaveBeenCalledWith(
    '/pigmyMobile/v2/transaction',
    expect.objectContaining({ schemeId: '38', transactionId: 'tx' }),
  );
});

test('posts peocit transactions to the peocit endpoint', async () => {
  const payload = {
    transactionId: '3c00c185-0579-4cac-a144-660950138fd7',
    userId: 2152,
    agentCode: 1001,
    agentName: 'Pampapathi Vandli',
    bankCode: 'PEO123',
    collectedAmount: 1500,
    finalAmount: 2000,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer_101',
    accountNumber: 101,
    bankType: 'peocit',
  };
  mockedApi.post.mockResolvedValueOnce({ data: { ok: true } });
  await createTransaction(payload);
  expect(mockedApi.post).toHaveBeenCalledWith('/pigmyMobile/v2/transaction/peocit', {
    userId: 2152,
    agentCode: 1001,
    agentName: 'Pampapathi Vandli',
    bankCode: 'PEO123',
    collectedAmount: 1500,
    finalAmount: 2000,
    schemename: 'Pigmy Deposit',
    schemeId: '38',
    collectiontype: 'cash',
    customerName: 'Customer_101',
    accountNumber: 101,
    transactionId: '3c00c185-0579-4cac-a144-660950138fd7',
  });
});

test('does not post an incomplete peocit transaction', async () => {
  await expect(
    createTransaction({
      transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
      collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38',
      collectiontype: 'cash', customerName: 'Customer', accountNumber: 3,
      bankType: 'peocit',
    }),
  ).rejects.toThrow('Peocit transaction is missing agent name or final amount.');
  expect(mockedApi.post).not.toHaveBeenCalled();
});

test('does not post an empty bank type as a banksoft transaction', async () => {
  await expect(
    createTransaction({
      transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
      collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38',
      collectiontype: 'cash', customerName: 'Customer', accountNumber: 3,
      bankType: '',
    }),
  ).rejects.toThrow('Unsupported bank type: ');
  expect(mockedApi.post).not.toHaveBeenCalled();
});

test('does not post a transaction for an unsupported bank type', async () => {
  await expect(
    createTransaction({
      transactionId: 'tx', userId: 1, agentCode: 2, bankCode: 'B1',
      collectedAmount: 100, schemename: 'Pigmy Deposit', schemeId: '38',
      collectiontype: 'cash', customerName: 'Customer', accountNumber: 3,
      bankType: 'other',
    }),
  ).rejects.toThrow('Unsupported bank type: other');
  expect(mockedApi.post).not.toHaveBeenCalled();
});
