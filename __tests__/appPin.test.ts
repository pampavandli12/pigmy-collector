import * as SecureStore from 'expo-secure-store';
import {
  MAX_PIN_ATTEMPTS,
  PinLockoutError,
  assertPinAvailable,
  hashPin,
  recordFailedPinAttempt,
  resetPinAttempts,
} from '../utils/appPin';
import { encryptionKeyFromBytes } from '../store/persistence';

beforeEach(() => {
  resetPinAttempts();
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
});

test('builds a 32-byte MMKV encryption key', () => {
  const key = encryptionKeyFromBytes(new Uint8Array(16).fill(0xab));
  expect(key).toHaveLength(32);
  expect(key).toMatch(/^[0-9a-f]{32}$/);
});

test('hashes the PIN instead of keeping the digits', async () => {
  await expect(hashPin('123456')).resolves.toBe(
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  );
});

test('locks further PIN attempts after the failure limit', async () => {
  const now = 1_000;
  for (let attempt = 0; attempt < MAX_PIN_ATTEMPTS - 1; attempt += 1) {
    await recordFailedPinAttempt(now);
  }

  await expect(recordFailedPinAttempt(now)).rejects.toBeInstanceOf(PinLockoutError);
  await expect(assertPinAvailable(now + 1)).rejects.toBeInstanceOf(PinLockoutError);
  await expect(assertPinAvailable(now + 5 * 60 * 1000)).resolves.toBeUndefined();
});
