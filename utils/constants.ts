import { Platform } from 'react-native';

const DEV_API_PORT = 1010;

export function resolveApiBaseUrl({
  configured,
  isDev,
  platformOs,
}: {
  configured: string | undefined;
  isDev: boolean;
  platformOs: string;
}) {
  const value = configured?.trim();
  if (isDev) {
    if (value) return value;
    const host = platformOs === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${host}:${DEV_API_PORT}`;
  }

  if (!value || !/^https:\/\//i.test(value)) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must be an https URL in production builds.',
    );
  }

  return value;
}

export const API_BASE_URL = resolveApiBaseUrl({
  configured: process.env.EXPO_PUBLIC_API_BASE_URL,
  isDev: __DEV__,
  platformOs: Platform.OS,
});

export const API_ENDPOINTS = {
  LOGIN: `/pigmyMobile/v2/login`,
  REFRESH_TOKEN: '/pigmyMobile/v2/login/refresh',
  AUTHENTICATE_ME: '/pigmyMobile/v2/login/authenticate',
  FETCH_CUSTOMERS: '/pigmyMobile/v2/user',
  FETCH_COLLECTIONS: '/pigmyMobile/v2/transaction/fetchCollections',
  ADD_TRANSACTION: '/pigmyMobile/v2/transaction',
  ADD_TRANSACTION_PEOCIT: '/pigmyMobile/v2/transaction/peocit',
} as const;
export const SECURE_STORE_KEY = 'userInfo';
export const AGENT_ACCOUNTS_SECURE_STORE_KEY = 'agentAccounts';
export const PIN_SECURE_STORE_KEY = 'appPin';
export const PIN_SALT_SECURE_STORE_KEY = 'appPinSalt';
export const PIN_ATTEMPT_SECURE_STORE_KEY = 'appPinAttempts';
export const MMKV_ENCRYPTION_KEY = 'mmkvEncryptionKey';
