import * as SecureStore from 'expo-secure-store';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState } from 'react-native';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { authenticateAgent } from '../services/authenticate';
import { saveAndActivateAccount } from '../services/authStorage';
import { authUserSchema } from '../types/auth';
import { hashPin, resetPinAttempts } from '../utils/appPin';

jest.mock('../services/authenticate', () => ({
  authenticateAgent: jest.fn(),
}));

const mockedAuthenticateAgent = authenticateAgent as jest.MockedFunction<
  typeof authenticateAgent
>;

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
  bankType: 'peocit',
  schemes: [{ schemeId: '38', schemeName: 'Pigmy Deposit' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  resetPinAttempts();
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  mockedAuthenticateAgent.mockResolvedValue({
    limitAmount: 50000,
    isAgentRevoked: false,
    lastDepositDate: '2026-06-19',
    graceDays: 0,
  });
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
  expect(mockedAuthenticateAgent).toHaveBeenCalledWith('9876543210');
});

test('logs out revoked agents when the lock screen loads', async () => {
  mockedAuthenticateAgent.mockResolvedValueOnce({
    limitAmount: 50000,
    isAgentRevoked: true,
    lastDepositDate: '2026-06-19',
    graceDays: 0,
  });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(user) : '123456'),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.authStatus).toBe('unauthenticated'));
  expect(result.current.user).toBeNull();
  expect(result.current.sessionNotice).toMatchObject({
    expiredAgentName: 'Agent',
    reason: 'revoked',
  });
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
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'appPin',
    await hashPin('123456'),
  );
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

test('locks the PIN after repeated incorrect attempts', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(user) : '123456'),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.authStatus).toBe('locked'));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await expect(result.current.unlockWithPin('000000')).resolves.toBe(false);
  }

  await expect(result.current.unlockWithPin('000000')).rejects.toThrow(
    'Too many incorrect PIN attempts. Try again later.',
  );
  expect(result.current.authStatus).toBe('locked');
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

test('locks onto the fallback account when the active agent is revoked', async () => {
  const values = new Map<string, string>();
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(values.get(key) ?? null),
  );
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(
    (key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    },
  );
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation((key: string) => {
    values.delete(key);
    return Promise.resolve();
  });

  const fallback = {
    ...user,
    agentCode: 2,
    agentName: 'Fallback',
    phoneNumber: '9876543211',
    accessToken: 'fallback-access',
    refreshToken: 'fallback-refresh',
  };
  const active = {
    ...user,
    agentCode: 3,
    agentName: 'Active',
    phoneNumber: '9876543212',
    accessToken: 'active-access',
    refreshToken: 'active-refresh',
  };
  await saveAndActivateAccount(fallback);
  await saveAndActivateAccount(active);
  values.set('appPin', '123456');
  mockedAuthenticateAgent.mockResolvedValue({
    limitAmount: 50000,
    isAgentRevoked: true,
    lastDepositDate: '2026-06-19',
    graceDays: 0,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.authStatus).toBe('locked'));
  expect(result.current.user?.agentName).toBe('Fallback');
  expect(result.current.user?.agentCode).toBe(2);
  expect(result.current.sessionNotice).toMatchObject({
    expiredAgentName: 'Active',
    replacementAgentName: 'Fallback',
    reason: 'revoked',
  });
});

test('locks only after a real absence, not a transient background', async () => {
  const listeners = new Set<(state: string) => void>();
  const subscription = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
      const typedListener = listener as (state: string) => void;
      listeners.add(typedListener);
      return {
        remove: () => {
          listeners.delete(typedListener);
        },
      };
    });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key === 'userInfo' ? JSON.stringify(user) : '123456'),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.authStatus).toBe('locked'));
  await act(async () => {
    await result.current.unlockWithPin('123456');
  });
  expect(result.current.authStatus).toBe('unlocked');

  await act(async () => {
    listeners.forEach((listener) => listener('inactive'));
  });
  expect(result.current.authStatus).toBe('unlocked');

  // A transient background/foreground (e.g. a Bluetooth/permission system
  // dialog) within the grace window must NOT re-lock the app.
  const nowSpy = jest.spyOn(Date, 'now');
  nowSpy.mockReturnValue(1_000);
  await act(async () => {
    listeners.forEach((listener) => listener('background'));
  });
  expect(result.current.authStatus).toBe('unlocked');

  nowSpy.mockReturnValue(1_500);
  await act(async () => {
    listeners.forEach((listener) => listener('active'));
  });
  expect(result.current.authStatus).toBe('unlocked');

  // A real absence longer than the grace window re-locks on return.
  nowSpy.mockReturnValue(10_000);
  await act(async () => {
    listeners.forEach((listener) => listener('background'));
  });
  expect(result.current.authStatus).toBe('unlocked');

  nowSpy.mockReturnValue(20_000);
  await act(async () => {
    listeners.forEach((listener) => listener('active'));
  });
  await waitFor(() => expect(result.current.authStatus).toBe('locked'));

  nowSpy.mockRestore();
  subscription.mockRestore();
});
