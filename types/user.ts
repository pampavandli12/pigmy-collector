export interface Customer {
  accountNumber: number;
  agentCode: number;
  bankCode: string;
  currentBalance: number;
  customerName: string;
  lastDepositDate: string;
  schemeId: string;
  userId: number;
}

export interface TransactionPayload {
  userId: number;
  agentCode: number;
  bankCode: string;
  collectedAmount: number;
  schemename: string;
  collectiontype: string;
  customerName: string;
  accountNumber: number;
}
