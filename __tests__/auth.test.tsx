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
  token: 'token',
};

beforeEach(() => jest.clearAllMocks());

test('validates complete authentication users', () => {
  expect(authUserSchema.parse(user)).toEqual(user);
  expect(() => authUserSchema.parse({ ...user, token: '' })).toThrow();
});

test('restores a valid stored user', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(user));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  expect(result.current.user).toEqual(user);
});

test('persists login and deletes storage on logout', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => result.current.login(user));
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userInfo', JSON.stringify(user));
  await act(async () => result.current.logout());
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userInfo');
});
