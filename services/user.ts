import { collectionSummarySchema, Customer, TransactionPayload } from '@/types/user';
import { API_ENDPOINTS } from '@/utils/constants';
import { getStoredUser } from './authStorage';
import { api } from './axios';

export const fetchCustomers = async ({
  agentCode,
  bankCode,
}: {
  agentCode: number;
  bankCode: string;
}): Promise<Customer[]> => {
  const storedUser = await getStoredUser();
  const bankType = storedUser?.bankType;
  return api
    .get(API_ENDPOINTS.FETCH_CUSTOMERS, {
      params: {
        agentCode,
        bankCode,
      },
      ...(bankType ? { headers: { bankType } } : {}),
    })
    .then((response) => response.data);
};

export const fetchCollections = async ({
  agentCode,
  bankCode,
  graceDays,
}: {
  agentCode: number;
  bankCode: string;
  graceDays: number;
}) => {
  const response = await api.get(API_ENDPOINTS.FETCH_COLLECTIONS, {
    params: { agentCode, bankCode, graceDays },
  });
  return collectionSummarySchema.parse(response.data);
};

const BANKSOFT = 'banksoft';
const PEOCIT = 'peocit';

function toBanksoftTransaction(payload: TransactionPayload) {
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
}

function toPeocitTransaction(payload: TransactionPayload) {
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
}

export const createTransaction = async (payload: TransactionPayload) => {
  const bankType = payload.bankType || BANKSOFT;
  if (bankType === PEOCIT) {
    return api
      .post(API_ENDPOINTS.ADD_TRANSACTION_PEOCIT, toPeocitTransaction(payload))
      .then((response) => response.data);
  }

  if (bankType !== BANKSOFT) {
    throw new Error(`Unsupported bank type: ${bankType}`);
  }

  return api
    .post(API_ENDPOINTS.ADD_TRANSACTION, toBanksoftTransaction(payload))
    .then((response) => response.data);
};
