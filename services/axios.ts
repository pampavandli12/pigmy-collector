import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authUserSchema } from '../types/auth';
import { API_BASE_URL, SECURE_STORE_KEY } from '../utils/constants';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    const storedUser = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    const parsedUser = storedUser
      ? authUserSchema.safeParse(JSON.parse(storedUser))
      : null;
    const token = parsedUser?.success ? parsedUser.data.token : null;

    console.debug('API Request:', config);
    config.headers['Content-Type'] = 'application/json';
    config.headers['Authorization'] = token || '';
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  },
);

// Interceptor for redirecting on 401 and logging responses/errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 403) {
      console.warn('Unauthorized! Clearing auth state.');
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    }
    console.error('API Error:', error);
    return Promise.reject(error);
  },
);
