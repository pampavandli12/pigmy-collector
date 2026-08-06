import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEY } from '@/utils/constants';
import { notifyAuthUserUpdated, notifyUnauthorized } from './authSession';
import { getStoredUser, updateStoredTokens } from './authStorage';
import { refreshAccessToken } from './tokenRefresh';

export type RetryableRequestConfig = {
  headers: Record<string, unknown>;
  _tokenRefreshAttempted?: boolean;
  [key: string]: unknown;
};

export type AuthHttpError = {
  config?: RetryableRequestConfig;
  response?: { status?: number };
};

let refreshPromise: ReturnType<typeof refreshSession> | null = null;

type AuthRefreshDependencies = {
  getStoredUser: typeof getStoredUser;
  refreshAccessToken: typeof refreshAccessToken;
  updateStoredTokens: typeof updateStoredTokens;
  notifyAuthUserUpdated: typeof notifyAuthUserUpdated;
  endSession: () => Promise<void>;
};

const defaultDependencies: AuthRefreshDependencies = {
  getStoredUser,
  refreshAccessToken,
  updateStoredTokens,
  notifyAuthUserUpdated,
  endSession: async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    await notifyUnauthorized();
  },
};

async function refreshSession(dependencies: AuthRefreshDependencies) {
  const storedUser = await dependencies.getStoredUser();
  if (!storedUser?.refreshToken) {
    throw new Error('No refresh token is available.');
  }

  const tokens = await dependencies.refreshAccessToken(storedUser.refreshToken);
  const updatedUser = await dependencies.updateStoredTokens(tokens);
  dependencies.notifyAuthUserUpdated(updatedUser);
  return updatedUser;
}

function getRefreshPromise(dependencies: AuthRefreshDependencies) {
  if (!refreshPromise) {
    refreshPromise = refreshSession(dependencies).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function handleAuthResponseError<T>(
  error: AuthHttpError,
  replayRequest: (config: RetryableRequestConfig) => Promise<T>,
  dependencies: AuthRefreshDependencies = defaultDependencies,
): Promise<T> {
  const status = error.response?.status;
  const originalRequest = error.config;

  if (status === 403) {
    await dependencies.endSession();
    return Promise.reject(error);
  }

  if (status !== 401) return Promise.reject(error);

  if (!originalRequest || originalRequest._tokenRefreshAttempted) {
    await dependencies.endSession();
    return Promise.reject(error);
  }

  originalRequest._tokenRefreshAttempted = true;
  let updatedUser;
  try {
    updatedUser = await getRefreshPromise(dependencies);
  } catch {
    await dependencies.endSession();
    return Promise.reject(error);
  }

  originalRequest.headers.Authorization = updatedUser.accessToken;
  return replayRequest(originalRequest);
}
