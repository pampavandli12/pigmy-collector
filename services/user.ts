import { collectionSummarySchema, Customer, TransactionPayload } from '@/types/user';
import { API_ENDPOINTS } from '@/utils/constants';
import { api } from './axios';

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

export const createTransaction = async (payload: TransactionPayload) => {
  return api
    .post(API_ENDPOINTS.ADD_TRANSACTION, payload)
    .then((response) => response.data);
};
