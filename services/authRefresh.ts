import { notifyAuthUserUpdated, notifyUnauthorized } from './authSession';
import {
  getAgentAccountId,
  getStoredAccountUser,
  updateStoredTokensForAccount,
} from './authStorage';
import { refreshAccessToken } from './tokenRefresh';

export type RetryableRequestConfig = {
  headers: Record<string, unknown>;
  _agentAccountId?: string;
  _tokenRefreshAttempted?: boolean;
  [key: string]: unknown;
};

export type AuthHttpError = {
  config?: RetryableRequestConfig;
  response?: { status?: number };
};

type AuthRefreshDependencies = {
  getStoredAccountUser: typeof getStoredAccountUser;
  refreshAccessToken: typeof refreshAccessToken;
  updateStoredTokensForAccount: typeof updateStoredTokensForAccount;
  notifyAuthUserUpdated: typeof notifyAuthUserUpdated;
  endSession: (accountId: string) => Promise<void>;
};

const defaultDependencies: AuthRefreshDependencies = {
  getStoredAccountUser,
  refreshAccessToken,
  updateStoredTokensForAccount,
  notifyAuthUserUpdated,
  endSession: notifyUnauthorized,
};

const refreshPromises = new Map<string, Promise<Awaited<ReturnType<typeof refreshSession>>>>();

// Drop any in-flight/settled refresh entries. Called on account switch/logout so a
// stuck entry (e.g. a hung refresh) cannot block future refreshes for an account
// id that is later re-used.
export function resetRefreshState() {
  refreshPromises.clear();
}

async function refreshSession(
  accountId: string,
  dependencies: AuthRefreshDependencies,
) {
  const storedUser = await dependencies.getStoredAccountUser(accountId);
  if (!storedUser?.refreshToken) {
    throw new Error('No refresh token is available.');
  }

  const tokens = await dependencies.refreshAccessToken(
    storedUser.refreshToken,
    storedUser.phoneNumber,
  );
  const updatedUser = await dependencies.updateStoredTokensForAccount(
    accountId,
    tokens,
  );
  dependencies.notifyAuthUserUpdated(accountId, updatedUser);
  return updatedUser;
}

function getRefreshPromise(
  accountId: string,
  dependencies: AuthRefreshDependencies,
) {
  const existing = refreshPromises.get(accountId);
  if (existing) return existing;
  const promise: Promise<Awaited<ReturnType<typeof refreshSession>>> = refreshSession(accountId, dependencies).finally(() => {
    // Only clear the entry if it's still THIS promise. resetRefreshState()
    // (switchAccount/logout) can clear the map while this promise is still
    // in-flight; if a newer refresh for the same accountId was started in the
    // meantime, this stale cleanup must not delete its entry out from under it.
    if (refreshPromises.get(accountId) === promise) {
      refreshPromises.delete(accountId);
    }
  });
  refreshPromises.set(accountId, promise);
  return promise;
}

// A transient network failure (dead/slow connection, request timeout) surfaces
// as an error with NO HTTP `response`. Such failures must never end the session —
// the credentials may be perfectly valid and simply unreachable. Anything the
// server actually answered, and any local "credentials unusable" error, is not
// transient.
function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    response?: unknown;
    code?: string;
    message?: string;
  };
  if (candidate.response) return false;
  if (
    candidate.code === 'ECONNABORTED' ||
    candidate.code === 'ETIMEDOUT' ||
    candidate.code === 'ERR_NETWORK'
  ) {
    return true;
  }
  return candidate.message === 'Network Error';
}

export async function handleAuthResponseError<T>(
  error: AuthHttpError,
  replayRequest: (config: RetryableRequestConfig) => Promise<T>,
  dependencies: AuthRefreshDependencies = defaultDependencies,
): Promise<T> {
  const status = error.response?.status;
  const originalRequest = error.config;
  const accountId = originalRequest?._agentAccountId;

  if (status !== 401 && status !== 403) return Promise.reject(error);
  if (!accountId) return Promise.reject(error);

  // The Pigmy API returns 403 (not only 401) when an access token has expired, so
  // both statuses get one refresh attempt. Known tradeoff: the API also uses 403
  // for pure business/permission denials that have nothing to do with token
  // expiry, and this code cannot tell the two apart on the FIRST 403 (only the
  // backend knows which one it meant) — so a business-rule 403 still costs one
  // extra refresh round trip before falling through unchanged below. Revisit if
  // the backend ever adds a distinguishing error code/body to first-403 responses.
  // Once we've already refreshed and replayed this request:
  //  - a repeat 401 means even the refreshed token is unauthenticated → the
  //    credentials are no longer valid (e.g. an admin reset the account) → end
  //    the session.
  //  - a repeat 403 means the token is valid and the endpoint is denying for a
  //    business/permission reason → surface the error to the caller WITHOUT
  //    logging the agent out mid-session.
  if (originalRequest?._tokenRefreshAttempted) {
    if (status === 401) {
      await dependencies.endSession(accountId);
    }
    return Promise.reject(error);
  }

  originalRequest._tokenRefreshAttempted = true;
  let updatedUser;
  try {
    updatedUser = await getRefreshPromise(accountId, dependencies);
  } catch (refreshError) {
    // The refresh call itself failed. A transient network error / timeout keeps
    // the session (the request will be retried). Any other failure — the server
    // rejected the refresh token, or there is no usable refresh credential —
    // means the session cannot continue, so end it (this preserves the
    // admin-reset / revoked-token forced logout).
    if (!isTransientNetworkError(refreshError)) {
      await dependencies.endSession(accountId);
    }
    return Promise.reject(error);
  }

  if (getAgentAccountId(updatedUser) !== accountId) {
    await dependencies.endSession(accountId);
    return Promise.reject(error);
  }
  originalRequest.headers.Authorization = updatedUser.accessToken;
  return replayRequest(originalRequest);
}
