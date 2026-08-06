import * as SecureStore from 'expo-secure-store';
import {
  AuthUser,
  authUserSchema,
  legacyAuthUserSchema,
  TokenRefreshResponse,
} from '@/types/auth';
import { SECURE_STORE_KEY } from '@/utils/constants';

export async function getStoredUser(): Promise<AuthUser | null> {
  const storedUser = await SecureStore.getItemAsync(SECURE_STORE_KEY);

  if (!storedUser) return null;

  try {
    const value: unknown = JSON.parse(storedUser);
    const currentUser = authUserSchema.safeParse(value);
    if (currentUser.success) return currentUser.data;

    const legacyUser = legacyAuthUserSchema.safeParse(value);
    if (legacyUser.success) {
      await SecureStore.setItemAsync(
        SECURE_STORE_KEY,
        JSON.stringify(legacyUser.data),
      );
      return legacyUser.data;
    }

    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return null;
  } catch {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return null;
  }
}

export async function getStoredToken() {
  return (await getStoredUser())?.accessToken ?? null;
}

export async function updateStoredTokens(
  tokens: TokenRefreshResponse,
): Promise<AuthUser> {
  const storedUser = await getStoredUser();
  if (!storedUser) throw new Error('No authenticated user is stored.');

  const updatedUser = authUserSchema.parse({ ...storedUser, ...tokens });
  await SecureStore.setItemAsync(
    SECURE_STORE_KEY,
    JSON.stringify(updatedUser),
  );
  return updatedUser;
}
