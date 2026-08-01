import { ReceiptData } from '@/utils/ReceiptPrinter';

export interface ReceiptBuilderInput {
  amount: string | number;
  customerId: string;
  accountNumber: string;
  date: string;
  scheme: string;
  customerName: string;
  openingBalance: number;
  totalBalance: number;
  bankName?: string | null;
  collectorName?: string | null;
  collectorPhone?: string | number | null;
}

export function parseReceiptAmount(amount: string | number): number {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : 0;
  }

  return Number(amount.replace(/[^0-9.]/g, '')) || 0;
}

export function buildReceiptData(input: ReceiptBuilderInput): ReceiptData {
  const numericAmount = parseReceiptAmount(input.amount);

  return {
    bankName: input.bankName,
    receiptNumber: `TX-${input.customerId}-${Date.now().toString().slice(-6)}`,
    date: input.date || new Date().toLocaleString(),
    items: [
      {
        name: `Deposit: ${input.scheme}`,
        quantity: 1,
        price: numericAmount,
        total: numericAmount,
      },
    ],
    subtotal: numericAmount,
    total: numericAmount,
    paymentMethod: 'Cash',
    customerName: input.customerName,
    accountNo: input.accountNumber,
    openingBalance: input.openingBalance,
    receivedAmount: numericAmount,
    totalBalance: input.totalBalance,
    collectorName: input.collectorName,
    collectorPhone: input.collectorPhone,
  };
}
