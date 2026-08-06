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

async function refreshSession(
  accountId: string,
  dependencies: AuthRefreshDependencies,
) {
  const storedUser = await dependencies.getStoredAccountUser(accountId);
  if (!storedUser?.refreshToken) {
    throw new Error('No refresh token is available.');
  }

  const tokens = await dependencies.refreshAccessToken(storedUser.refreshToken);
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
  const promise = refreshSession(accountId, dependencies).finally(() => {
    refreshPromises.delete(accountId);
  });
  refreshPromises.set(accountId, promise);
  return promise;
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

  if (status === 403 || originalRequest?._tokenRefreshAttempted) {
    await dependencies.endSession(accountId);
    return Promise.reject(error);
  }

  originalRequest._tokenRefreshAttempted = true;
  let updatedUser;
  try {
    updatedUser = await getRefreshPromise(accountId, dependencies);
  } catch {
    await dependencies.endSession(accountId);
    return Promise.reject(error);
  }

  if (getAgentAccountId(updatedUser) !== accountId) {
    await dependencies.endSession(accountId);
    return Promise.reject(error);
  }
  originalRequest.headers.Authorization = updatedUser.accessToken;
  return replayRequest(originalRequest);
}
