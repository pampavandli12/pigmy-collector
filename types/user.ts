import { z } from 'zod';

export interface Customer {
  accountNumber: number;
  customerName: string;
  currentBalance: number;
  lastDepositDate: string;
  schemeId: string;

  agentCode: number;
  bankCode: string;
  // Nullable: a customer with no phone on file must not disqualify the whole
  // record from customerSchema (see services/user.ts's per-record parsing).
  mobilenumber: string | null;
  userId: number;
}

export interface SyncableTransactionPayload {
  transactionId: string;
  userId: number;
  agentCode: number;
  bankCode: string;
  collectedAmount: number;
  schemename: string;
  schemeId: string;
  collectiontype: string;
  customerName: string;
  accountNumber: number;
  bankType?: string;
  agentName?: string;
  finalAmount?: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface OutboxItem {
  payload: SyncableTransactionPayload;

  status: SyncStatus;

  retryCount: number;

  error?: string;

  createdAt: number;

  nextRetryAt?: number;

  retryHeld?: boolean;

  // True when the failure is a definite rejection (4xx / unsupported bank type)
  // that will never succeed on retry — distinct from a transient failure that
  // merely exhausted its automatic attempts. A manual "retry failed" skips these.
  permanent?: boolean;

  // True once the balance this transaction added at queue time has been
  // subtracted back out after a `permanent` failure. Guards
  // revertCustomerBalanceForFailedTransaction against double-reverting if a
  // permanent item is ever re-processed.
  balanceReverted?: boolean;
}

export const INVALID_DEPOSIT_MESSAGE = 'Enter an amount greater than zero.';
export const UNABLE_TO_SAVE_DEPOSIT_MESSAGE = 'Unable to save this deposit.';
export const SCHEME_REQUIRED_MESSAGE = 'Select a scheme.';

export const customerSchema = z.object({
  // The server sends this as a numeric string (e.g. "101"), not a number.
  accountNumber: z.coerce.number().int(),
  customerName: z.string().min(1),
  currentBalance: z.number().finite(),
  lastDepositDate: z.string(),
  schemeId: z.string(),
  agentCode: z.number().int(),
  bankCode: z.string().min(1),
  // A customer with no phone on file legitimately has a missing/null value
  // here; requiring it would drop the entire record (see services/user.ts).
  // hasUsablePhoneNumber/normalizeWhatsAppNumber already gate SMS/WhatsApp use
  // at the point of use, so no format validation belongs here.
  mobilenumber: z.string().nullable(),
  userId: z.number().int(),
});

export const customerListSchema = z.array(customerSchema);

const transactionFields = {
  transactionId: z.string().min(1),
  userId: z.number().int(),
  agentCode: z.number().int(),
  bankCode: z.string().min(1),
  collectedAmount: z.number().finite().positive(),
  schemename: z.string().min(1),
  schemeId: z.string().min(1),
  collectiontype: z.string().min(1),
  customerName: z.string().min(1),
  accountNumber: z.number().int(),
};

export const banksoftTransactionSchema = z
  .object({
    ...transactionFields,
    bankType: z.literal('banksoft'),
  })
  .strict();

export const peocitTransactionSchema = z
  .object({
    ...transactionFields,
    bankType: z.literal('peocit'),
    agentName: z.string().min(1),
    finalAmount: z.number().finite(),
  })
  .strict();

export const transactionPayloadSchema = z.discriminatedUnion('bankType', [
  banksoftTransactionSchema,
  peocitTransactionSchema,
]);

export type TransactionPayload = z.infer<typeof transactionPayloadSchema>;

export type LocalTransaction = TransactionPayload & {
  date: string;
};

export const collectionSummarySchema = z
  .object({
    totalTransactions: z.number().int().nonnegative(),
    totalAmountCollected: z.number().nonnegative(),
  })
  .strict();

export type CollectionSummary = z.infer<typeof collectionSummarySchema>;
