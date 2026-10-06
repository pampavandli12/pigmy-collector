import { SyncableTransactionPayload } from '@/types/user';
import { isToday } from '@/utils/isToday';
import { store$ } from './store';

// Shared by store/actions.ts (queueing a deposit) and store/syncEngine.ts
// (reverting one that was permanently rejected) — kept separate from both to
// avoid a circular import between them.
function adjustCustomerBalanceForToday(
  payload: SyncableTransactionPayload,
  createdAt: number,
  delta: number,
) {
  if (!isToday(createdAt)) {
    return;
  }

  const customer$ = store$.customers[payload.accountNumber];
  const customer = customer$.peek();

  if (!customer) {
    return;
  }

  customer$.currentBalance.set(Number(customer.currentBalance || 0) + delta);
}

export function updateCustomerBalanceForToday(
  payload: SyncableTransactionPayload,
  createdAt: number,
) {
  adjustCustomerBalanceForToday(
    payload,
    createdAt,
    Number(payload.collectedAmount || 0),
  );
}

// Undoes the optimistic addition made at queue time once a deposit is known to
// have permanently failed (4xx rejection / unsupported bank type) — otherwise
// the customer's shown balance stays inflated by an amount that was never
// actually collected, for the rest of the calendar day.
export function revertCustomerBalanceForFailedTransaction(
  payload: SyncableTransactionPayload,
  createdAt: number,
) {
  adjustCustomerBalanceForToday(
    payload,
    createdAt,
    -Number(payload.collectedAmount || 0),
  );
}
