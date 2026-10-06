// Shared by components/TransactionForm.tsx (live input validation) and
// app/userDetail.tsx (the confirm-time backstop) so the two can't drift apart.
// Strict digit-shape match (not just Number.isFinite) rejects scientific
// notation ("1e5"), excess decimal places, and implausibly long pasted digit
// strings in one step — Number.isFinite alone accepts all of those. The 7-digit
// cap (up to 99,99,999.99) comfortably exceeds any realistic single deposit
// while still blocking pasted garbage, independent of whether the agent's
// per-agent `limitAmount` is configured (utils/collectionLimit.ts fails open
// when it's null/undefined).
const DEPOSIT_AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

export function parseDepositAmount(value: string): number | null {
  const trimmed = String(value ?? '').trim();
  if (!DEPOSIT_AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }

  const numericAmount = Number(trimmed);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return numericAmount;
}
