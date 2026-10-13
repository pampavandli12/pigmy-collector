/**
 * Proactive token-refresh policy, called from `services/axios.ts`'s request
 * interceptor before every authenticated call. `ensureFreshAccessToken`
 * refreshes ahead of expiry (single-flight per account via `refreshPromises`,
 * so concurrent requests share one refresh call) and ends the session on a
 * non-recoverable failure; `handleUnauthorizedResponse` is the thin
 * response-side backstop for a 401 that still gets through.
 */
import { notifyAuthUserUpdated, notifyUnauthorized } from './authSession';
import {
  getAgentAccountId,
  getStoredAccountUser,
  updateStoredTokensForAccount,
} from './authStorage';
import { refreshAccessToken } from './tokenRefresh';
import { getJwtExpiryMs } from '@/utils/jwt';

export type RetryableRequestConfig = {
  headers: Record<string, unknown>;
  _agentAccountId?: string;
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

// A token within this many ms of its exp claim (or already past it) is
// refreshed proactively, before the request that needs it is ever sent.
export const PROACTIVE_REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

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

export type EnsureFreshAccessTokenResult =
  | { status: 'ready'; token: string }
  | { status: 'sessionEnded' };

// Called from the request interceptor before every authenticated request.
// Refreshes ahead of expiry instead of waiting for the server to reject a
// stale token. A token that can't be decoded as a JWT at all is treated as
// needing a refresh too (conservative default — see PROACTIVE_REFRESH_THRESHOLD_MS
// callers), since we'd otherwise have no way to know it's about to expire.
export async function ensureFreshAccessToken(
  accountId: string,
  dependencies: AuthRefreshDependencies = defaultDependencies,
): Promise<EnsureFreshAccessTokenResult> {
  const storedUser = await dependencies.getStoredAccountUser(accountId);
  if (!storedUser?.accessToken) {
    return { status: 'ready', token: storedUser?.accessToken ?? '' };
  }

  const expiresAtMs = getJwtExpiryMs(storedUser.accessToken);
  const needsRefresh =
    expiresAtMs === null ||
    expiresAtMs - Date.now() <= PROACTIVE_REFRESH_THRESHOLD_MS;

  if (!needsRefresh) {
    return { status: 'ready', token: storedUser.accessToken };
  }

  try {
    const updatedUser = await getRefreshPromise(accountId, dependencies);
    if (getAgentAccountId(updatedUser) !== accountId) {
      throw new Error('Refreshed account does not match the requested account.');
    }
    return { status: 'ready', token: updatedUser.accessToken };
  } catch (refreshError) {
    // A transient network error / timeout keeps the session alive — the
    // unrefreshed token is sent as-is; if it's genuinely dead, the response
    // interceptor's handleUnauthorizedResponse ends the session on the
    // resulting 401. Any other failure (server rejected the refresh token,
    // no refresh credential was stored, or an account mismatch) means the
    // session cannot continue.
    if (isTransientNetworkError(refreshError)) {
      return { status: 'ready', token: storedUser.accessToken };
    }
    try {
      await dependencies.endSession(accountId);
    } catch (endSessionError) {
      console.error('Failed to end session after refresh failure:', endSessionError);
    }
    return { status: 'sessionEnded' };
  }
}

type EndSessionDependencies = { endSession: AuthRefreshDependencies['endSession'] };

// Called from the response interceptor. There is no refresh-and-retry here
// anymore — ensureFreshAccessToken already refreshed before the request went
// out, so a 401 means even a just-refreshed token was rejected (or no
// proactive check ran for this request) and the session is over. A 403 is
// left untouched: the API overloads it for business/permission denials that
// have nothing to do with token expiry.
export async function handleUnauthorizedResponse(
  error: AuthHttpError,
  dependencies: EndSessionDependencies = defaultDependencies,
): Promise<never> {
  const status = error.response?.status;
  const accountId = error.config?._agentAccountId;

  if (status === 401 && accountId) {
    try {
      await dependencies.endSession(accountId);
    } catch (endSessionError) {
      console.error('Failed to end session after 401:', endSessionError);
    }
  }

  return Promise.reject(error);
}
