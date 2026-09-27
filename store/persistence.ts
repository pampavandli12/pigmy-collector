import { MMKV_ENCRYPTION_KEY } from '@/utils/constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV, type MMKV } from 'react-native-mmkv';

const STORAGE_ID = 'dailyapplabs-storage';

export function encryptionKeyFromBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

let storage: MMKV | null =
  process.env.NODE_ENV === 'test' ? createMMKV({ id: STORAGE_ID }) : null;

export async function initPersistence() {
  if (process.env.NODE_ENV === 'test') return;
  if (storage?.isEncrypted) return;

  const existing = await SecureStore.getItemAsync(MMKV_ENCRYPTION_KEY);
  if (existing && existing.length === 32) {
    storage = createMMKV({
      id: STORAGE_ID,
      encryptionKey: existing,
      encryptionType: 'AES-256',
    });
    return;
  }

  // Open any existing plaintext store first, then encrypt it in place.
  storage = createMMKV({ id: STORAGE_ID });
  const key = encryptionKeyFromBytes(await Crypto.getRandomBytesAsync(16));
  storage.encrypt(key, 'AES-256');
  await SecureStore.setItemAsync(MMKV_ENCRYPTION_KEY, key);
}

function requireStorage() {
  if (!storage) {
    throw new Error('Local storage is not ready.');
  }
  return storage;
}

function removeKey(key: string) {
  const current = requireStorage() as MMKV & { delete?: (name: string) => void };
  if (typeof current.remove === 'function') return current.remove(key);
  current.delete?.(key);
  return true;
}

export const mmkv = {
  getString(key: string) {
    return requireStorage().getString(key);
  },
  set(key: string, value: string | number | boolean) {
    requireStorage().set(key, value);
  },
  remove(key: string) {
    return removeKey(key);
  },
  delete(key: string) {
    removeKey(key);
  },
};
