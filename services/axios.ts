import axios, { InternalAxiosRequestConfig } from 'axios';
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

type AugmentedRequestConfig = InternalAxiosRequestConfig & {
  _agentAccountId?: string;
  _authHeadersResolved?: boolean;
};

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    config.headers['Content-Type'] = 'application/json';
    const augmented = config as AugmentedRequestConfig;

    if (isPublicAuthRoute(config.url)) {
      applyAuthHeaders(config.headers, null);
      delete augmented._agentAccountId;
      augmented._authHeadersResolved = true;
      return config;
    }

    // A request replayed after a token refresh (services/authRefresh.ts) already
    // carries the account context and freshly-refreshed Authorization header it
    // was issued under. Re-deriving from "whichever account is active right now"
    // on the replay pass would silently re-tag it with a different account's
    // token/bankType if the active account changed mid-refresh. Only resolve
    // auth headers once per request.
    if (augmented._authHeadersResolved) {
      return config;
    }

    const auth = await getStoredAuthContext();
    applyAuthHeaders(config.headers, auth);
    augmented._agentAccountId = auth?.accountId;
    augmented._authHeadersResolved = true;
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
