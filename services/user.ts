import { collectionSummarySchema, Customer, customerSchema, SyncableTransactionPayload } from '@/types/user';
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
  const response = await api.get(API_ENDPOINTS.FETCH_CUSTOMERS, {
    params: {
      agentCode,
      bankCode,
    },
    ...(await bankTypeHeaders()),
  });

  // Parse per-record so a single malformed customer from the backend cannot
  // blank the entire customer list. Keep the valid rows, drop and count the bad
  // ones.
  const raw = Array.isArray(response.data) ? response.data : [];
  const customers: Customer[] = [];
  let skipped = 0;
  for (const item of raw) {
    const parsed = customerSchema.safeParse(item);
    if (parsed.success) {
      customers.push(parsed.data);
    } else {
      skipped += 1;
    }
  }

  if (skipped > 0) {
    console.warn(`Skipped ${skipped} malformed customer record(s) from the server.`);
  }

  return customers;
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
