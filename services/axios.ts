import axios from 'axios';
import { isPublicAuthRoute } from '../utils/apiRoutes';
import { API_BASE_URL } from '../utils/constants';
import { handleAuthResponseError } from './authRefresh';
import { getStoredAuthContext } from './authStorage';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    config.headers['Content-Type'] = 'application/json';

    if (isPublicAuthRoute(config.url)) {
      delete config.headers.Authorization;
      delete (config as typeof config & { _agentAccountId?: string })
        ._agentAccountId;
      return config;
    }

    const auth = await getStoredAuthContext();
    if (auth) {
      config.headers.Authorization = auth.token;
      (config as typeof config & { _agentAccountId?: string })._agentAccountId =
        auth.accountId;
    } else {
      delete config.headers.Authorization;
    }
    console.log('config', config);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Refresh expired access tokens once, and log out on non-recoverable auth errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isPublicAuthRoute(error.config?.url)) {
      return Promise.reject(error);
    }

    return handleAuthResponseError(error, (config) =>
      api.request(config as Parameters<typeof api.request>[0]),
    );
  },
);
