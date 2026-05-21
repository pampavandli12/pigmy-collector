import { observable } from "@legendapp/state";

import { mmkv } from "./persistence";

import { Customer, OutboxItem } from "@/types/user";

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

export const store$ = observable<AppState>({
  customers: loadStorage("customers", {}),

  outbox: loadStorage("outbox", {}),

  searchQuery: "",

  isRefreshingCustomers: false,

  lastCustomerSync: null,
});

store$.customers.onChange(({ value }) => {
  mmkv.set("customers", JSON.stringify(value));
});

store$.outbox.onChange(({ value }) => {
  mmkv.set("outbox", JSON.stringify(value));
});
