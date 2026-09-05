import * as SecureStore from 'expo-secure-store';
import {
  getStoredToken,
  getStoredUser,
  updateStoredAgentProfile,
  updateStoredTokens,
} from '../services/authStorage';

beforeEach(() => jest.clearAllMocks());

test('returns a validated stored token', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
    agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
    phoneNumber: '9876543210', lastDepositDate: '2026-06-19', limitAmount: 50000,
    graceDays: 0, accessToken: 'secret', refreshToken: 'refresh',
  }));
  await expect(getStoredToken()).resolves.toBe('secret');
});

test('migrates a legacy stored user without losing its session', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
    agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
    token: 'legacy-token', phoneNumber: '9876543210',
  }));
  await expect(getStoredUser()).resolves.toMatchObject({
    accessToken: 'legacy-token', refreshToken: null, limitAmount: null,
  });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'userInfo', expect.stringContaining('"accessToken":"legacy-token"'),
  );
});

test('returns null when no user is stored', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  await expect(getStoredToken()).resolves.toBeNull();
});

test('clears malformed stored authentication', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{broken');
  await expect(getStoredToken()).resolves.toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userInfo');
});

test('replaces both stored tokens without changing user metadata', async () => {
  const storedUser = {
    agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name',
    phoneNumber: '9876543210', lastDepositDate: '2026-06-19', limitAmount: 50000,
    graceDays: 0, accessToken: 'old-access', refreshToken: 'old-refresh',
  };
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(storedUser),
  );
  await expect(updateStoredTokens({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  })).resolves.toEqual({
    ...storedUser,
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'userInfo',
    JSON.stringify({
      ...storedUser,
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    }),
  );
});

test('updates stored agent profile fields for the active account', async () => {
  const storedUser = {
    agentCode: 1,
    agentName: 'Agent',
    bankCode: 'B',
    bankName: 'Bank Name',
    phoneNumber: '9876543210',
    lastDepositDate: '2026-06-19',
    limitAmount: 50000,
    graceDays: 0,
    accessToken: 'access',
    refreshToken: 'refresh',
  };
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify(storedUser),
  );

  await expect(
    updateStoredAgentProfile('B:1', {
      limitAmount: 40000,
      lastDepositDate: '2026-08-06',
      graceDays: 2,
    }),
  ).resolves.toEqual({
    ...storedUser,
    limitAmount: 40000,
    lastDepositDate: '2026-08-06',
    graceDays: 2,
  });
});
