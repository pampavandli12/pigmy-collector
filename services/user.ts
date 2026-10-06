import { collectionSummarySchema, Customer, customerSchema, SyncableTransactionPayload } from '@/types/user';
import { API_ENDPOINTS } from '@/utils/constants';
import { showSnackbar } from '@/utils/snackbar';
import { getBankAdapter } from './banks/registry';
import { api } from './axios';

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
    // Silently dropping records left the agent with no way to know a customer
    // was missing from their list; surface a visible (if unobtrusive) signal.
    showSnackbar(
      `${skipped} customer record${skipped === 1 ? '' : 's'} could not be loaded.`,
      { type: 'error' },
    );
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
  });
  return collectionSummarySchema.parse(response.data);
};

export const createTransaction = async (payload: SyncableTransactionPayload) => {
  const adapter = getBankAdapter(payload);
  const response = await api.post(adapter.endpoint, adapter.toRequest(payload));
  return response.data;
};
