import * as SecureStore from 'expo-secure-store';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { authUserSchema } from '../types/auth';

const user = {
  agentCode: 1,
  agentName: 'Agent',
  bankCode: 'BANK',
  bankName: 'Pigmy Bank',
  phoneNumber: '9876543210',
  lastDepositDate: '2026-06-19',
  limitAmount: 50000,
  graceDays: 0,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
});

test('validates complete authentication users', () => {
  expect(authUserSchema.parse(user)).toEqual(user);
  expect(() => authUserSchema.parse({ ...user, accessToken: '' })).toThrow();
});

test('restores a valid stored user in the locked state', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(user) : '123456'),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  expect(result.current.user).toEqual(user);
  expect(result.current.authStatus).toBe('locked');
});

test('sets up a PIN and keeps it when logging out', async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => result.current.login(user));
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userInfo', JSON.stringify(user));
  expect(result.current.authStatus).toBe('pinSetupRequired');
  await act(async () => result.current.setupPin('123456'));
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('appPin', '123456');
  expect(result.current.authStatus).toBe('unlocked');
  await act(async () => result.current.logout());
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userInfo');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith('appPin');
});

test('unlocks only when the stored PIN matches', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(user) : '123456'),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.authStatus).toBe('locked'));
  await expect(result.current.unlockWithPin('000000')).resolves.toBe(false);
  expect(result.current.authStatus).toBe('locked');
  await act(async () => {
    await expect(result.current.unlockWithPin('123456')).resolves.toBe(true);
  });
  expect(result.current.authStatus).toBe('unlocked');
});

test('requires PIN setup for a migrated legacy session', async () => {
  const legacyUser = {
    agentCode: 1,
    agentName: 'Agent',
    bankCode: 'BANK',
    bankName: 'Pigmy Bank',
    token: 'legacy-token',
    phoneNumber: '9876543210',
  };
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(legacyUser) : null),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() =>
    expect(result.current.authStatus).toBe('pinSetupRequired'),
  );
  expect(result.current.user?.accessToken).toBe('legacy-token');
  expect(result.current.user?.limitAmount).toBeNull();
});

test('a fresh API login is unlocked when the device already has a PIN', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'appPin' ? '123456' : null),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.authStatus).toBe('unauthenticated'));
  await act(async () => result.current.login(user));
  expect(result.current.authStatus).toBe('unlocked');
});
