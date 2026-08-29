import { observable } from '@legendapp/state';

import { mmkv } from './persistence';

import { Customer, OutboxItem } from '@/types/user';
import { AuthUser } from '@/types/auth';
import { getAgentAccountId } from '@/services/authStorage';

interface AppState {
  customers: Record<number, Customer>;

  outbox: Record<string, OutboxItem>;

  searchQuery: string;

  isRefreshingCustomers: boolean;

  lastCustomerSync: number | null;
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const value = mmkv.getString(key);

    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

let activeStoragePrefix: string | null = null;
let activeAgentId: string | null = null;
let isHydrating = false;

function scopedKey(name: string) {
  return `${activeStoragePrefix}:${name}`;
}

function removeStorage(key: string) {
  const storage = mmkv as typeof mmkv & { delete?: (name: string) => void };
  if (typeof storage.remove === 'function') storage.remove(key);
  else storage.delete?.(key);
}

export const store$ = observable<AppState>({
  customers: loadStorage('customers', {}),

  outbox: loadStorage('outbox', {}),

  searchQuery: '',

  isRefreshingCustomers: false,

  lastCustomerSync: null,
});

store$.customers.onChange(({ value }) => {
  if (activeStoragePrefix && !isHydrating) {
    mmkv.set(scopedKey('customers'), JSON.stringify(value));
  }
});

store$.outbox.onChange(({ value }) => {
  if (activeStoragePrefix && !isHydrating) {
    mmkv.set(scopedKey('outbox'), JSON.stringify(value));
  }
});

store$.lastCustomerSync.onChange(({ value }) => {
  if (activeStoragePrefix && !isHydrating) {
    value === null
      ? removeStorage(scopedKey('lastCustomerSync'))
      : mmkv.set(scopedKey('lastCustomerSync'), value);
  }
});

export function activateAgentStore(user: AuthUser, migrateLegacy = false) {
  const nextPrefix = `agent:${getAgentAccountId(user)}`;
  if (activeStoragePrefix === nextPrefix) return;

  const hasScopedData = mmkv.getString(`${nextPrefix}:customers`) !== undefined;
  const customers = hasScopedData
    ? loadStorage<Record<number, Customer>>(`${nextPrefix}:customers`, {})
    : migrateLegacy
      ? loadStorage<Record<number, Customer>>('customers', {})
      : {};
  const outbox = hasScopedData
    ? loadStorage<Record<string, OutboxItem>>(`${nextPrefix}:outbox`, {})
    : migrateLegacy
      ? loadStorage<Record<string, OutboxItem>>('outbox', {})
      : {};

  activeStoragePrefix = nextPrefix;
  activeAgentId = getAgentAccountId(user);
  isHydrating = true;
  store$.customers.set(customers);
  store$.outbox.set(outbox);
  store$.searchQuery.set('');
  store$.isRefreshingCustomers.set(false);
  store$.lastCustomerSync.set(
    loadStorage<number | null>(scopedKey('lastCustomerSync'), null),
  );
  isHydrating = false;

  mmkv.set(scopedKey('customers'), JSON.stringify(customers));
  mmkv.set(scopedKey('outbox'), JSON.stringify(outbox));
  if (migrateLegacy && !hasScopedData) {
    removeStorage('customers');
    removeStorage('outbox');
  }
}

export function getActiveAgentId() {
  return activeAgentId;
}

export function updateAgentOutboxItem(
  accountId: string,
  transactionId: string,
  update: Partial<OutboxItem>,
) {
  const key = `agent:${accountId}:outbox`;
  const outbox = loadStorage<Record<string, OutboxItem>>(key, {});
  const item = outbox[transactionId];
  if (!item) return;
  outbox[transactionId] = { ...item, ...update };
  mmkv.set(key, JSON.stringify(outbox));
}
