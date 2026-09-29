import { API_ENDPOINTS } from '@/utils/constants';
import { BankTransactionAdapter, commonTransactionFields } from './types';

export const BANKSOFT = 'banksoft' as const;

export const banksoftAdapter: BankTransactionAdapter = {
  bankType: BANKSOFT,
  endpoint: API_ENDPOINTS.ADD_TRANSACTION,
  buildPayload(draft) {
    return {
      ...commonTransactionFields(draft),
      bankType: BANKSOFT,
    };
  },
  toRequest(payload) {
    return {
      userId: payload.userId,
      agentCode: payload.agentCode,
      bankCode: payload.bankCode,
      collectedAmount: payload.collectedAmount,
      schemename: payload.schemename,
      schemeId: payload.schemeId,
      collectiontype: payload.collectiontype,
      customerName: payload.customerName,
      accountNumber: payload.accountNumber,
      transactionId: payload.transactionId,
    };
  },
};
