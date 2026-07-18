import { OutboxItem } from '@/types/user';

export function startOfLocalDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function shouldRemoveOutboxItem(
  item: OutboxItem,
  now = Date.now(),
) {
  return item.createdAt < startOfLocalDay(now);
}
