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

// Ensures the (async) init runs exactly once even if several callers invoke it
// concurrently. Without this, overlapping calls could each generate a key and
// double-encrypt, leaving the DB encrypted with a key that was not persisted.
let initPromise: Promise<void> | null = null;

async function createEncryptedStore() {
  // Persist the key BEFORE encrypting so we can never end up with a store that is
  // encrypted with a key we failed to save (which would lock the DB permanently).
  const key = encryptionKeyFromBytes(await Crypto.getRandomBytesAsync(16));
  await SecureStore.setItemAsync(MMKV_ENCRYPTION_KEY, key);
  const store = createMMKV({ id: STORAGE_ID });
  store.encrypt(key, 'AES-256');
  return store;
}

async function doInitPersistence() {
  const existing = await SecureStore.getItemAsync(MMKV_ENCRYPTION_KEY);
  if (existing && existing.length === 32) {
    try {
      const candidate = createMMKV({
        id: STORAGE_ID,
        encryptionKey: existing,
        encryptionType: 'AES-256',
      });
      // Touch the store to confirm the key actually opens it; a mismatch throws.
      candidate.getString('__health_check__');
      storage = candidate;
      return;
    } catch (error) {
      // Stored key can't open the DB (corrupt/mismatched). Recover by wiping and
      // re-creating rather than hard-failing at startup — persisted data here is
      // a cache/outbox, and the outbox is validated on load.
      console.warn('Local storage key mismatch; recreating store.', error);
    }
  }

  storage = await createEncryptedStore();
}

export function initPersistence() {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  if (storage?.isEncrypted) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = doInitPersistence().finally(() => {
    initPromise = null;
  });
  return initPromise;
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
