//const LOCAL_API_BASE_URL = 'http://10.0.2.2:1010';
const LOCAL_API_BASE_URL = 'https://pigmymobile-api.onrender.com';
const PRODUCTION_API_BASE_URL = 'https://pigmy.app';

export const API_BASE_URL = __DEV__
  ? LOCAL_API_BASE_URL
  : PRODUCTION_API_BASE_URL;

export const API_ENDPOINTS = {
  LOGIN: `/pigmyMobile/v2/login`,
  FETCH_CUSTOMERS: '/pigmyMobile/v2/user',
  ADD_TRANSACTION: '/pigmyMobile/v2/transaction',
} as const;
export const SECURE_STORE_KEY = 'userInfo';
export const DB_NAME = 'pigmy_collector.db';
export const TABLE_NAME = 'transactions';
