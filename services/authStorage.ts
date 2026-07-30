import * as SecureStore from 'expo-secure-store';
import { authUserSchema } from '@/types/auth';
import { SECURE_STORE_KEY } from '@/utils/constants';

export async function getStoredToken() {
  const storedUser = await SecureStore.getItemAsync(SECURE_STORE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = authUserSchema.safeParse(JSON.parse(storedUser));
    return parsedUser.success ? parsedUser.data.token : null;
  } catch {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return null;
  }
}
