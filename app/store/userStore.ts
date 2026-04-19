// store/useCounter.ts
import { fetchCustomers } from '@/services/user';
import { Status } from '@/types/sharedEnums';
import { Customer } from '@/types/user';
import { create } from 'zustand';
import { useAuth } from '../providers/AuthProvider';

type State = {
  customers: Customer[];
  loadCustomerStatus: Status;
};
type Actions = {
  loadCustomers: (payload: {
    agentCode: number;
    bankCode: string;
  }) => Promise<void>;
};

const useUser = create<State & Actions>((set) => ({
  customers: [],
  loadCustomerStatus: Status.Idle,
  loadCustomers: async (payload: { agentCode: number; bankCode: string }) => {
    const { logout } = useAuth();
    set({ loadCustomerStatus: Status.Loading });
    try {
      const customers = await fetchCustomers(payload);
      set({ customers, loadCustomerStatus: Status.Success });
    } catch (error) {
      set({ loadCustomerStatus: Status.Error });
      if ((error as any).response && (error as any).response.status === 403) {
        const { logout } = useAuth();
        logout();
      }
      throw error;
    }
  },
}));
export default useUser;
