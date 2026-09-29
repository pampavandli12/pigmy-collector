import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  PIN_ATTEMPT_SECURE_STORE_KEY,
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

export async function hashPin(pin: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export function isUsableStoredPin(storedPin: string | null) {
  return (
    storedPin !== null &&
    (/^\d{6}$/.test(storedPin) || /^[a-f0-9]{64}$/.test(storedPin))
  );
}

export async function storedPinMatches(storedPin: string | null, pin: string) {
  if (!storedPin) return false;
  const hashed = await hashPin(pin);
  if (storedPin === hashed) return true;
  if (storedPin === pin) {
    await SecureStore.setItemAsync(PIN_SECURE_STORE_KEY, hashed);
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
