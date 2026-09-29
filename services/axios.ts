import axios from 'axios';
import { isPublicAuthRoute } from '../utils/apiRoutes';
import { API_BASE_URL } from '../utils/constants';
import { handleAuthResponseError } from './authRefresh';
import { getStoredAuthContext } from './authStorage';
import { applyAuthHeaders } from './requestAuthHeaders';

// A finite timeout is essential for a field app on flaky mobile networks:
// without it a dead/slow connection hangs requests indefinitely, freezing the
// startup/foreground spinner and blocking outbox-idle waits (account switch /
// logout). A timeout surfaces as a network error (no `response`), which the auth
// layer treats as transient rather than an auth failure.
export const REQUEST_TIMEOUT_MS = 20000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    config.headers['Content-Type'] = 'application/json';

    if (isPublicAuthRoute(config.url)) {
      applyAuthHeaders(config.headers, null);
      delete (config as typeof config & { _agentAccountId?: string })
        ._agentAccountId;
      return config;
    }

    const auth = await getStoredAuthContext();
    applyAuthHeaders(config.headers, auth);
    (config as typeof config & { _agentAccountId?: string })._agentAccountId =
      auth?.accountId;
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
