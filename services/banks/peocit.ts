/**
 * The `peocit` bank adapter. Requires `agentName`, a computed `finalAmount`
 * (opening balance + collected amount), and `vpncode` (sourced per-customer
 * from the fetch-customers response) — a deposit missing any of these is
 * rejected locally before it's ever queued or sent.
 */
import { API_ENDPOINTS } from '@/utils/constants';
import { BankTransactionAdapter, commonTransactionFields } from './types';

export const PEOCIT = 'peocit' as const;

export const peocitAdapter: BankTransactionAdapter = {
  bankType: PEOCIT,
  endpoint: API_ENDPOINTS.ADD_TRANSACTION_PEOCIT,
  buildPayload(draft) {
    const agentName = draft.agentName?.trim() ?? '';
    const vpncode = draft.vpncode?.trim() ?? '';
    const finalAmount = draft.openingBalance + draft.collectedAmount;
    if (!agentName || !vpncode || !Number.isFinite(finalAmount)) {
      throw new Error(
        'Peocit transaction is missing agent name, final amount, or vpn code.',
      );
    }

    return {
      ...commonTransactionFields(draft),
      bankType: PEOCIT,
      agentName,
      finalAmount,
      vpncode,
    };
  },
  toRequest(payload) {
    if (
      !payload.agentName ||
      typeof payload.finalAmount !== 'number' ||
      !payload.vpncode
    ) {
      throw new Error(
        'Peocit transaction is missing agent name, final amount, or vpn code.',
      );
    }

    const request = {
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
      vpncode: payload.vpncode,
    };
    // TEMP smoke-test log — remove after manually verifying vpncode is sent.
    console.log('[peocit toRequest]', JSON.stringify(request));
    return request;
  },
};
