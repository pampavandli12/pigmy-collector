import { API_ENDPOINTS } from '@/utils/constants';
import { BankTransactionAdapter, commonTransactionFields } from './types';

export const PEOCIT = 'peocit' as const;

export const peocitAdapter: BankTransactionAdapter = {
  bankType: PEOCIT,
  endpoint: API_ENDPOINTS.ADD_TRANSACTION_PEOCIT,
  buildPayload(draft) {
    const agentName = draft.agentName?.trim() ?? '';
    const finalAmount = draft.openingBalance + draft.collectedAmount;
    if (!agentName || !Number.isFinite(finalAmount)) {
      throw new Error('Peocit transaction is missing agent name or final amount.');
    }

    return {
      ...commonTransactionFields(draft),
      bankType: PEOCIT,
      agentName,
      finalAmount,
    };
  },
  toRequest(payload) {
    if (!payload.agentName || typeof payload.finalAmount !== 'number') {
      throw new Error('Peocit transaction is missing agent name or final amount.');
    }

    return {
      userId: payload.userId,
      agentCode: payload.agentCode,
      agentName: payload.agentName,
      bankCode: payload.bankCode,
      collectedAmount: payload.collectedAmount,
      finalAmount: payload.finalAmount,
      schemename: payload.schemename,
      schemeId: payload.schemeId,
      collectiontype: payload.collectiontype,
      customerName: payload.customerName,
      accountNumber: payload.accountNumber,
      transactionId: payload.transactionId,
    };
  },
};
