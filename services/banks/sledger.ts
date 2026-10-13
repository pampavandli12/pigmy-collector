/**
 * The `sledger` bank adapter. Requires `agentName` and a per-customer
 * `branchCode`; its request omits `schemename` (unlike the other adapters)
 * and sends `accountNumber` as a string to match that backend's contract,
 * even though it's stored as a number everywhere else in the app.
 */
import { API_ENDPOINTS } from '@/utils/constants';
import { BankTransactionAdapter, commonTransactionFields } from './types';

export const SLEDGER = 'sledger' as const;

export const sledgerAdapter: BankTransactionAdapter = {
  bankType: SLEDGER,
  endpoint: API_ENDPOINTS.ADD_TRANSACTION_SLEDGER,
  buildPayload(draft) {
    const agentName = draft.agentName?.trim() ?? '';
    const branchCode = draft.branchCode?.trim() ?? '';
    if (!agentName || !branchCode) {
      throw new Error(
        'Sledger transaction is missing agent name or branch code.',
      );
    }

    return {
      ...commonTransactionFields(draft),
      bankType: SLEDGER,
      agentName,
      branchCode,
    };
  },
  toRequest(payload) {
    if (!payload.agentName || !payload.branchCode) {
      throw new Error(
        'Sledger transaction is missing agent name or branch code.',
      );
    }

    return {
      userId: payload.userId,
      agentCode: payload.agentCode,
      agentName: payload.agentName,
      bankCode: payload.bankCode,
      collectedAmount: payload.collectedAmount,
      schemeId: payload.schemeId,
      collectiontype: payload.collectiontype,
      customerName: payload.customerName,
      accountNumber: String(payload.accountNumber),
      transactionId: payload.transactionId,
      branchCode: payload.branchCode,
    };
  },
};
