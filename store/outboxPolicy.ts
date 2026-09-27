import { isUnsupportedBankTypeError } from '@/services/banks/errors';
import { OutboxItem } from '@/types/user';

const OUTBOX_STATUSES = new Set(['pending', 'syncing', 'failed', 'synced']);

export function isValidOutboxItem(item: unknown): item is OutboxItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const candidate = item as Partial<OutboxItem>;
  const payload = candidate.payload;

  return (
    Boolean(payload && typeof payload === 'object') &&
    typeof payload?.transactionId === 'string' &&
    payload.transactionId.length > 0 &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.retryCount === 'number' &&
    OUTBOX_STATUSES.has(candidate.status ?? '')
  );
}

export function shouldRemoveOutboxItem(
  item: unknown,
  _now = Date.now(),
) {
  return !isValidOutboxItem(item);
}

export const MAX_AUTO_RETRIES = 5;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

export function retryDelayMs(retryCount: number) {
  const delay = 30_000 * 2 ** Math.max(0, retryCount - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

export function httpStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }

  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' ? status : undefined;
}

export function isDefiniteClientRejection(error: unknown) {
  const status = httpStatus(error);
  if (status === undefined || status === 408 || status === 429) {
    return false;
  }

  return status >= 400 && status < 500;
}

export function canAutoRetry(item: OutboxItem, now = Date.now()) {
  if (item.retryHeld) return false;
  if (item.retryCount >= MAX_AUTO_RETRIES) return false;
  if (typeof item.nextRetryAt === 'number' && item.nextRetryAt > now) {
    return false;
  }

  return true;
}

export function buildSyncFailure(
  item: OutboxItem,
  message: string,
  error: unknown,
  now = Date.now(),
): Partial<OutboxItem> {
  const retryCount = item.retryCount + 1;
  const retryHeld =
    isUnsupportedBankTypeError(error) ||
    isDefiniteClientRejection(error) ||
    retryCount >= MAX_AUTO_RETRIES;

  return {
    status: 'failed',
    retryCount,
    error: message,
    nextRetryAt: retryHeld ? undefined : now + retryDelayMs(retryCount),
    retryHeld,
  };
}
