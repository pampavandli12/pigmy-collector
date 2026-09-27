import { collectionSummarySchema, Customer, customerListSchema, SyncableTransactionPayload } from '@/types/user';
import { API_ENDPOINTS } from '@/utils/constants';
import { getBankAdapter } from './banks/registry';
import { getStoredUser } from './authStorage';
import { api } from './axios';

async function bankTypeHeaders() {
  const storedUser = await getStoredUser();
  const bankType = storedUser?.bankType?.trim();
  return bankType ? { headers: { bankType } } : {};
}

export const fetchCustomers = async ({
  agentCode,
  bankCode,
}: {
  agentCode: number;
  bankCode: string;
}): Promise<Customer[]> => {
  return api
    .get(API_ENDPOINTS.FETCH_CUSTOMERS, {
      params: {
        agentCode,
        bankCode,
      },
      ...(await bankTypeHeaders()),
    })
    .then((response) => customerListSchema.parse(response.data));
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
    ...(await bankTypeHeaders()),
  });
  return collectionSummarySchema.parse(response.data);
};

export const createTransaction = async (payload: SyncableTransactionPayload) => {
  const adapter = getBankAdapter(payload);
  const response = await api.post(adapter.endpoint, adapter.toRequest(payload));
  return response.data;
};
