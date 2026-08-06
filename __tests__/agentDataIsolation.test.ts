import { activateAgentStore, store$ } from '../store/store';
import { AuthUser } from '../types/auth';

function agent(agentCode: number): AuthUser {
  return {
    agentCode,
    agentName: `Agent ${agentCode}`,
    bankCode: 'ISOLATION-BANK',
    bankName: 'Isolation Bank',
    phoneNumber: `98765432${agentCode.toString().padStart(2, '0')}`,
    lastDepositDate: null,
    limitAmount: null,
    graceDays: null,
    accessToken: `access-${agentCode}`,
    refreshToken: `refresh-${agentCode}`,
  };
}

test('customers and local transactions are restored only for their agent', () => {
  const firstAgent = agent(91);
  const secondAgent = agent(92);

  activateAgentStore(firstAgent);
  store$.customers.set({
    1001: {
      accountNumber: 1001,
      customerName: 'First customer',
      currentBalance: 50,
      lastDepositDate: '2026-08-06',
      schemeId: 'P',
      agentCode: firstAgent.agentCode,
      bankCode: firstAgent.bankCode,
      mobilenumber: '9876543210',
      userId: 1,
    },
  });
  store$.outbox.set({
    'first-transaction': {
      payload: {
        transactionId: 'first-transaction',
        userId: 1,
        agentCode: firstAgent.agentCode,
        bankCode: firstAgent.bankCode,
        collectedAmount: 50,
        schemename: 'P',
        collectiontype: 'cash',
        customerName: 'First customer',
        accountNumber: 1001,
      },
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    },
  });

  activateAgentStore(secondAgent);
  expect(store$.customers.peek()).toEqual({});
  expect(store$.outbox.peek()).toEqual({});

  store$.customers.set({});
  store$.outbox.set({});
  activateAgentStore(firstAgent);
  expect(store$.customers[1001].peek()?.customerName).toBe('First customer');
  expect(store$.outbox['first-transaction'].peek()?.payload.agentCode).toBe(91);
});
