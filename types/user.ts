export interface Customer {
  accountNumber: number;
  customerName: string;
  currentBalance: number;
  lastDepositDate: string;
  schemeId: string;

  agentCode: number;
  bankCode: string;
  mobilenumber: string;
  userId: number;
}

export interface TransactionPayload {
  transactionId: string;

  userId: number;
  agentCode: number;
  bankCode: string;

  collectedAmount: number;

  schemename: string;
  collectiontype: string;

  customerName: string;
  accountNumber: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface OutboxItem {
  payload: TransactionPayload;

  status: SyncStatus;

  retryCount: number;

  error?: string;

  createdAt: number;
}
// TODO: remove this after legend state implementation
export interface LocalTransaction extends TransactionPayload {
  date: string;
}
