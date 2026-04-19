const LOCAL_API_BASE_URL = 'http://10.0.2.2:1010';
const PRODUCTION_API_BASE_URL = 'https://pigmy.app';

export const API_BASE_URL = __DEV__
  ? LOCAL_API_BASE_URL
  : PRODUCTION_API_BASE_URL;

export const API_ENDPOINTS = {
  login: `/pigmyMobile/v2/login`,
} as const;
export const SECURE_STORE_KEY = 'userInfo';
