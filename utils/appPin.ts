import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  PIN_ATTEMPT_SECURE_STORE_KEY,
  PIN_SALT_SECURE_STORE_KEY,
  PIN_SECURE_STORE_KEY,
} from '@/utils/constants';

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 5 * 60 * 1000;

export class PinLockoutError extends Error {
  readonly lockedUntil: number;

  constructor(lockedUntil: number) {
    super('Too many incorrect PIN attempts. Try again later.');
    this.name = 'PinLockoutError';
    this.lockedUntil = lockedUntil;
  }
}

type AttemptState = {
  failures: number;
  lockedUntil?: number;
};

let memory: AttemptState = { failures: 0 };

export function resetPinAttempts() {
  memory = { failures: 0 };
}

// A 6-digit PIN is only a 10^6 space, so an unsalted hash is trivially
// reversible via a precomputed table if the stored value is ever extracted.
// `salt` defaults to '' so this stays the plain, backward-compatible digest
// for verifying/upgrading pre-existing unsalted hashes (see storedPinMatches).
export async function hashPin(pin: string, salt = '') {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);
}

async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function storePin(pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_SECURE_STORE_KEY, salt);
  await SecureStore.setItemAsync(PIN_SECURE_STORE_KEY, hash);
}

export function isUsableStoredPin(storedPin: string | null) {
  return (
    storedPin !== null &&
    (/^\d{6}$/.test(storedPin) || /^[a-f0-9]{64}$/.test(storedPin))
  );
}

export async function storedPinMatches(storedPin: string | null, pin: string) {
  if (!storedPin) return false;

  const salt = await SecureStore.getItemAsync(PIN_SALT_SECURE_STORE_KEY);
  if (salt) {
    return storedPin === (await hashPin(pin, salt));
  }

  // No salt on record: this is a pre-upgrade unsalted hash, or (older still) a
  // plaintext-stored PIN. Verify against both, then upgrade to a fresh salted
  // hash on success so the weaker forms are never checked again.
  const unsaltedHash = await hashPin(pin);
  if (storedPin === unsaltedHash || storedPin === pin) {
    await storePin(pin);
    return true;
  }
  return false;
}

function parseAttemptState(raw: string | null): AttemptState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<AttemptState>;
    if (typeof candidate.failures !== 'number') return null;
    return {
      failures: candidate.failures,
      lockedUntil:
        typeof candidate.lockedUntil === 'number' ? candidate.lockedUntil : undefined,
    };
  } catch {
    return null;
  }
}

async function readAttemptState(now: number) {
  const stored = parseAttemptState(
    await SecureStore.getItemAsync(PIN_ATTEMPT_SECURE_STORE_KEY),
  );
  const state = stored ?? memory;
  if (state.lockedUntil && state.lockedUntil <= now) {
    return { failures: 0 };
  }
  return state;
}

async function writeAttemptState(state: AttemptState) {
  memory = state;
  await SecureStore.setItemAsync(
    PIN_ATTEMPT_SECURE_STORE_KEY,
    JSON.stringify(state),
  );
}

export async function assertPinAvailable(now = Date.now()) {
  const state = await readAttemptState(now);
  if (state.lockedUntil && state.lockedUntil > now) {
    throw new PinLockoutError(state.lockedUntil);
  }
}

export async function recordFailedPinAttempt(now = Date.now()) {
  const state = await readAttemptState(now);
  const failures = state.failures + 1;
  if (failures >= MAX_PIN_ATTEMPTS) {
    const lockedUntil = now + PIN_LOCKOUT_MS;
    await writeAttemptState({ failures: 0, lockedUntil });
    throw new PinLockoutError(lockedUntil);
  }

  await writeAttemptState({ failures });
}

export async function clearPinAttempts() {
  memory = { failures: 0 };
  await SecureStore.deleteItemAsync(PIN_ATTEMPT_SECURE_STORE_KEY);
}
