import { Customer } from '@/types/user';
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
