import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { handleAuthResponseError } from './authRefresh';
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

// Refresh expired access tokens once, and log out on non-recoverable auth errors.
api.interceptors.response.use(
  (response) => response,
  (error) =>
    handleAuthResponseError(error, (config) =>
      api.request(config as Parameters<typeof api.request>[0]),
    ),
);
