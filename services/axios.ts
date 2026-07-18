import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_STORE_KEY } from '../utils/constants';
import { notifyUnauthorized } from './authSession';
import { getStoredToken } from './authStorage';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    config.headers['Content-Type'] = 'application/json';
    if (token) {
      config.headers.Authorization = token;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor for logging out on forbidden responses and logging errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 403) {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      await notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);
