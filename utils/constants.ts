//export const API_BASE_URL = 'http://localhost:1010';
export const API_BASE_URL = 'https://pigmymobile-api.onrender.com';

export const API_ENDPOINTS = {
  LOGIN: `/pigmyMobile/v2/login`,
  REFRESH_TOKEN: '/pigmyMobile/v2/login/refresh',
  AUTHENTICATE_ME: '/pigmyMobile/v2/login/authenticate',
  FETCH_CUSTOMERS: '/pigmyMobile/v2/user',
  FETCH_COLLECTIONS: '/pigmyMobile/v2/transaction/fetchCollections',
  ADD_TRANSACTION: '/pigmyMobile/v2/transaction',
} as const;
export const SECURE_STORE_KEY = 'userInfo';
export const AGENT_ACCOUNTS_SECURE_STORE_KEY = 'agentAccounts';
export const PIN_SECURE_STORE_KEY = 'appPin';
export const DB_NAME = 'pigmy_collector.db';
export const TABLE_NAME = 'transactions';
