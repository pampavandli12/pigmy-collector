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
