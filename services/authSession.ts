/**
 * A tiny in-memory pub/sub that decouples the non-React auth/axios layer from
 * `providers/AuthProvider.tsx`: `authRefresh.ts` calls `notifyUnauthorized`/
 * `notifyAuthUserUpdated` without importing React, and AuthProvider registers
 * the actual handlers (ending a session, syncing in-memory user state).
 */
import { AuthUser } from '@/types/auth';

type UnauthorizedHandler = (accountId: string) => void | Promise<void>;
type AuthUserUpdatedHandler = (accountId: string, user: AuthUser) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let authUserUpdatedHandler: AuthUserUpdatedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = async (accountId: string) => {
  await unauthorizedHandler?.(accountId);
};

export const setAuthUserUpdatedHandler = (
  handler: AuthUserUpdatedHandler | null,
) => {
  authUserUpdatedHandler = handler;
};

export const notifyAuthUserUpdated = (accountId: string, user: AuthUser) => {
  authUserUpdatedHandler?.(accountId, user);
};
