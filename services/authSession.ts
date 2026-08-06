import { AuthUser } from '@/types/auth';

type UnauthorizedHandler = () => void | Promise<void>;
type AuthUserUpdatedHandler = (user: AuthUser) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let authUserUpdatedHandler: AuthUserUpdatedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = async () => {
  await unauthorizedHandler?.();
};

export const setAuthUserUpdatedHandler = (
  handler: AuthUserUpdatedHandler | null,
) => {
  authUserUpdatedHandler = handler;
};

export const notifyAuthUserUpdated = (user: AuthUser) => {
  authUserUpdatedHandler?.(user);
};
