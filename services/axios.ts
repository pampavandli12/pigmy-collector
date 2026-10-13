/**
 * The shared axios instance every API call in the app goes through.
 * Request interceptor resolves auth headers and proactively refreshes the
 * access token before it expires (`resolveRequestAuth`,
 * `services/authRefresh.ts`); response interceptor ends the session on a
 * 401 and passes a 403 through untouched (`handleUnauthorizedResponse`).
 */
import axios, { InternalAxiosRequestConfig } from "axios";
import { isPublicAuthRoute } from "../utils/apiRoutes";
import { API_BASE_URL } from "../utils/constants";
import { ensureFreshAccessToken, handleUnauthorizedResponse } from "./authRefresh";
import { getStoredAuthContext } from "./authStorage";
import { applyAuthHeaders } from "./requestAuthHeaders";

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
    "Content-Type": "application/json",
  },
});

export type AugmentedRequestConfig = InternalAxiosRequestConfig & {
  _agentAccountId?: string;
  _authHeadersResolved?: boolean;
};

// Resolves auth headers for one request, refreshing the access token first if
// it's already expired or expiring within PROACTIVE_REFRESH_THRESHOLD_MS
// (services/authRefresh.ts) — so the request normally succeeds on its first
// try instead of failing with 401 and having nothing left to retry against.
export async function resolveRequestAuth(
  config: AugmentedRequestConfig,
): Promise<AugmentedRequestConfig> {
  if (isPublicAuthRoute(config.url)) {
    applyAuthHeaders(config.headers, null);
    delete config._agentAccountId;
    config._authHeadersResolved = true;
    return config;
  }

  // Only resolve auth headers once per request — guards against double work
  // if this config is ever re-entered (e.g. re-queued for another reason).
  if (config._authHeadersResolved) {
    return config;
  }

  const auth = await getStoredAuthContext();
  if (!auth) {
    applyAuthHeaders(config.headers, null);
    delete config._agentAccountId;
    config._authHeadersResolved = true;
    return config;
  }

  const refreshed = await ensureFreshAccessToken(auth.accountId);
  config._authHeadersResolved = true;
  if (refreshed.status === "sessionEnded") {
    return Promise.reject(new Error("Your session has expired. Please log in again."));
  }

  applyAuthHeaders(config.headers, { ...auth, token: refreshed.token });
  config._agentAccountId = auth.accountId;
  return config;
}

// Interceptor for adding auth token and logging requests/responses
api.interceptors.request.use(
  async (config) => {
    config.headers["Content-Type"] = "application/json";
    console.log(
      "Request:",
      config.method?.toUpperCase(),
      config.url,
      config.params || config.data,
    );
    return resolveRequestAuth(config as AugmentedRequestConfig);
  },
  (error) => {
    return Promise.reject(error);
  },
);

// No refresh-and-retry here — resolveRequestAuth already refreshed ahead of
// expiry. A 401 means the (possibly just-refreshed) token was rejected
// outright, so the session ends. A 403 is left untouched: the API overloads
// it for business/permission denials unrelated to token expiry.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isPublicAuthRoute(error.config?.url)) {
      return Promise.reject(error);
    }

    return handleUnauthorizedResponse(error);
  },
);
