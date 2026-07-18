jest.mock('../services/user', () => ({ fetchCustomers: jest.fn(), createTransaction: jest.fn() }));
jest.mock('../services/authSession', () => ({ notifyUnauthorized: jest.fn() }));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import { createTransaction, fetchCustomers } from '../services/user';
import { Status } from '../types/sharedEnums';
import useUser from '../store/userStore';
import { showSnackbar } from '../utils/snackbar';

beforeEach(() => {
  jest.clearAllMocks();
  useUser.setState({ customers: [], loadCustomerStatus: Status.Idle, createTransactionStatus: Status.Idle });
});

test('loads customers into the legacy store', async () => {
  (fetchCustomers as jest.Mock).mockResolvedValue([{ accountNumber: 1 }]);
  await useUser.getState().loadCustomers({ agentCode: 1, bankCode: 'B' });
  expect(useUser.getState()).toMatchObject({ loadCustomerStatus: Status.Success, customers: [{ accountNumber: 1 }] });
});

test('reports customer loading failures', async () => {
  (fetchCustomers as jest.Mock).mockRejectedValue(new Error('offline'));
  await useUser.getState().loadCustomers({ agentCode: 1, bankCode: 'B' });
  expect(useUser.getState().loadCustomerStatus).toBe(Status.Error);
  expect(showSnackbar).toHaveBeenCalledWith('Failed to load customers. Please try again.');
});

test('updates transaction creation status', async () => {
  (createTransaction as jest.Mock).mockResolvedValue({ ok: true });
  await useUser.getState().createTransaction({} as never);
  expect(useUser.getState().createTransactionStatus).toBe(Status.Success);
});
