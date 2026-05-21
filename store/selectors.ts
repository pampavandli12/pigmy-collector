import { computed } from "@legendapp/state";

import { store$ } from "./store";

export const filteredCustomers$ = computed(() => {
  const query = store$.searchQuery.get().toLowerCase().trim();

  const customers = Object.values(store$.customers.get());

  if (!query) {
    return customers;
  }

  return customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(query) ||
      customer.accountNumber.toString().includes(query),
  );
});
