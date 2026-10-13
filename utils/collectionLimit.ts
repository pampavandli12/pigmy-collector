/**
 * Enforces the agent's per-agent daily collection limit (from the
 * authenticate response). Fails open — a missing/invalid `limitAmount` means
 * no limit is enforced — so bad or absent backend data never blocks a
 * deposit. Used by `app/userDetail.tsx` before a deposit is queued.
 */
export const COLLECTION_LIMIT_EXCEEDED_MESSAGE =
  'Daily collection limit exceeded. Please deposit the collected amount to the bank.';

export interface CollectionLimitResult {
  allowed: boolean;
  remaining: number | null;
  limitAmount: number | null;
}

export function evaluateCollectionLimit(
  limitAmount: number | null | undefined,
  todaysCollectedAmount: number,
  additionalAmount = 0,
): CollectionLimitResult {
  if (
    limitAmount === null ||
    limitAmount === undefined ||
    !Number.isFinite(limitAmount) ||
    limitAmount < 0
  ) {
    return { allowed: true, remaining: null, limitAmount: null };
  }

  const collected = Number(todaysCollectedAmount || 0);
  const additional = Number(additionalAmount || 0);
  const remaining = Math.max(0, limitAmount - collected);
  const allowed =
    additional > 0
      ? collected + additional <= limitAmount
      : collected < limitAmount;

  return {
    allowed,
    remaining,
    limitAmount,
  };
}
