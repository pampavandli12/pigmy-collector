import * as SecureStore from 'expo-secure-store';
import { getStoredToken } from '../services/authStorage';

beforeEach(() => jest.clearAllMocks());

test('returns a validated stored token', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
    agentCode: 1, agentName: 'Agent', bankCode: 'B', bankName: 'Bank Name', token: 'secret',
    phoneNumber: '9876543210',
  }));
  await expect(getStoredToken()).resolves.toBe('secret');
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
