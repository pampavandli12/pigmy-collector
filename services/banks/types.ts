/**
 * The contract every bank adapter implements (`BankTransactionAdapter`): its
 * endpoint, how to build a stored payload from a deposit draft, and how to
 * shape that payload into the actual HTTP request body. `DepositDraft` is
 * the input every adapter receives; `commonTransactionFields` is the subset
 * every bank shares.
 */
import { TransactionPayload, SyncableTransactionPayload } from '@/types/user';

export interface DepositDraft {
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
  openingBalance: number;
  agentName?: string;
  branchCode?: string;
  vpncode?: string;
}

export function commonTransactionFields(draft: DepositDraft) {
  return {
    transactionId: draft.transactionId,
    userId: draft.userId,
    agentCode: draft.agentCode,
    bankCode: draft.bankCode,
    collectedAmount: draft.collectedAmount,
    schemename: draft.schemename,
    schemeId: draft.schemeId,
    collectiontype: draft.collectiontype,
    customerName: draft.customerName,
    accountNumber: draft.accountNumber,
  };
}

export interface BankTransactionAdapter {
  bankType: string;
  endpoint: string;
  buildPayload: (draft: DepositDraft) => TransactionPayload;
  toRequest: (payload: SyncableTransactionPayload) => Record<string, unknown>;
}
