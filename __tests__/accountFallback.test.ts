import * as SecureStore from 'expo-secure-store';
import {
  deactivateStoredAccount,
  getStoredAccounts,
  getStoredUser,
  saveAndActivateAccount,
} from '../services/authStorage';
import { AuthUser } from '../types/auth';

const values = new Map<string, string>();

function agent(agentCode: number, agentName: string): AuthUser {
  return {
    agentCode,
    agentName,
    bankCode: 'B',
    bankName: 'Bank Name',
    phoneNumber: `98765432${agentCode.toString().padStart(2, '0')}`,
    lastDepositDate: null,
    limitAmount: null,
    graceDays: null,
    accessToken: `access-${agentCode}`,
    refreshToken: `refresh-${agentCode}`,
  };
}

beforeEach(() => {
  values.clear();
  jest.useFakeTimers();
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
});

afterEach(() => jest.useRealTimers());

test('disables only the expired account and selects the most recently used fallback', async () => {
  jest.setSystemTime(new Date('2026-08-06T09:00:00Z'));
  await saveAndActivateAccount(agent(1, 'Bob'));
  jest.setSystemTime(new Date('2026-08-06T10:00:00Z'));
  await saveAndActivateAccount(agent(2, 'Alice'));
  jest.setSystemTime(new Date('2026-08-06T11:00:00Z'));
  await saveAndActivateAccount(agent(3, 'Dave'));

  const result = await deactivateStoredAccount('B:3');

  expect(result.wasActive).toBe(true);
  expect(result.activeUser?.agentName).toBe('Alice');
  expect((await getStoredUser())?.agentName).toBe('Alice');
  expect(await getStoredAccounts()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ accountId: 'B:3', status: 'loginRequired' }),
      expect.objectContaining({ accountId: 'B:1', status: 'available' }),
    ]),
  );
});

test('a late response for the disabled account cannot log out the fallback', async () => {
  await saveAndActivateAccount(agent(1, 'Bob'));
  await saveAndActivateAccount(agent(3, 'Dave'));
  await deactivateStoredAccount('B:3');

  const lateResult = await deactivateStoredAccount('B:3');

  expect(lateResult.wasActive).toBe(false);
  expect((await getStoredUser())?.agentName).toBe('Bob');
});

test('retains a login-required profile when there is no fallback', async () => {
  await saveAndActivateAccount(agent(3, 'Dave'));

  const result = await deactivateStoredAccount('B:3');

  expect(result.activeUser).toBeNull();
  expect(await getStoredUser()).toBeNull();
  expect(await getStoredAccounts()).toEqual([
    expect.objectContaining({
      accountId: 'B:3',
      agentName: 'Dave',
      status: 'loginRequired',
    }),
  ]);
  expect(values.get('agentAccounts')).not.toContain('access-3');
  expect(values.get('agentAccounts')).not.toContain('refresh-3');
});
