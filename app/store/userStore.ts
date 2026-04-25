// store/useCounter.ts
import { createTransaction, fetchCustomers } from '@/services/user';
import { Status } from '@/types/sharedEnums';
import { Customer, TransactionPayload } from '@/types/user';
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
    } catch (error) {
      set({ loadCustomerStatus: Status.Error });
      throw error;
    }
  },
  createTransaction: async (payload: TransactionPayload) => {
    set({ createTransactionStatus: Status.Loading });
    try {
      const response = await createTransaction(payload);
      await saveTransactionLocally(payload);
      console.log('Transaction response', response);
      set({ createTransactionStatus: Status.Success });
    } catch (error) {
      set({ createTransactionStatus: Status.Error });
      throw error;
    }
  },
}));
export default useUser;
