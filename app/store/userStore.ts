// store/useCounter.ts
import { createTransaction, fetchCustomers } from '@/services/user';
import { Status } from '@/types/sharedEnums';
import { Customer, TransactionPayload } from '@/types/user';
import { showSnackbar } from '@/utils/snackbar';
import { saveTransactionLocally } from '@/utils/transactions';
import { create } from 'zustand';

type State = {
  customers: Customer[];
  loadCustomerStatus: Status;
  createTransactionStatus: Status;
};
type Actions = {
  loadCustomers: (payload: {
    agentCode: number;
    bankCode: string;
  }) => Promise<void>;
  createTransaction: (payload: TransactionPayload) => Promise<void>;
};

const useUser = create<State & Actions>((set) => ({
  customers: [],
  loadCustomerStatus: Status.Idle,
  createTransactionStatus: Status.Idle,
  loadCustomers: async (payload: { agentCode: number; bankCode: string }) => {
    set({ loadCustomerStatus: Status.Loading, customers: [] });
    try {
      const customers = await fetchCustomers(payload);
      set({ customers, loadCustomerStatus: Status.Success });
    } catch (error: unknown) {
      set({ loadCustomerStatus: Status.Error });
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 403) {
        showSnackbar('Session expired. Please log in again.');
        return;
      }
      showSnackbar('Failed to load customers. Please try again.'); // Show error message to user
    }
  },
  createTransaction: async (payload: TransactionPayload) => {
    set({ createTransactionStatus: Status.Loading });
    try {
      const response = await createTransaction(payload);
      await saveTransactionLocally(payload);
      set({ createTransactionStatus: Status.Success });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      set({ createTransactionStatus: Status.Error });
      if (err.response?.status === 403) {
        showSnackbar('Session expired. Please log in again.');
        return;
      }
      showSnackbar('Failed to create transaction. Please try again.'); // Show error message to user
    }
  },
}));
export default useUser;
