import { Platform } from 'react-native';

function getLocalDevApiBaseUrl() {
  // Android emulators cannot reach the host machine via localhost.
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:1010`;
}

export const API_BASE_URL = getLocalDevApiBaseUrl();
//export const API_BASE_URL = 'https://pigmymobile-api.onrender.com';

export const API_ENDPOINTS = {
  LOGIN: `/pigmyMobile/v2/login`,
  REFRESH_TOKEN: '/pigmyMobile/v2/login/refresh',
  FETCH_CUSTOMERS: '/pigmyMobile/v2/user',
  ADD_TRANSACTION: '/pigmyMobile/v2/transaction',
} as const;
export const SECURE_STORE_KEY = 'userInfo';
export const AGENT_ACCOUNTS_SECURE_STORE_KEY = 'agentAccounts';
export const PIN_SECURE_STORE_KEY = 'appPin';
export const DB_NAME = 'pigmy_collector.db';
export const TABLE_NAME = 'transactions';
