import { SyncableTransactionPayload } from '@/types/user';
import { BANKSOFT, banksoftAdapter } from './banksoft';
import { UnsupportedBankTypeError } from './errors';
import { peocitAdapter } from './peocit';
import { BankTransactionAdapter } from './types';

export const UNSUPPORTED_BANK_DEPOSIT_MESSAGE =
  'Deposits are not available for this bank yet.';

const adapters: BankTransactionAdapter[] = [banksoftAdapter, peocitAdapter];

const adaptersByType = new Map(
  adapters.map((adapter) => [adapter.bankType, adapter]),
);

export function isRegisteredBankType(
  bankType: string | undefined,
): bankType is string {
  return typeof bankType === 'string' && adaptersByType.has(bankType);
}

export function getRegisteredBankAdapter(
  bankType: string | undefined,
): BankTransactionAdapter | undefined {
  if (!isRegisteredBankType(bankType)) {
    return undefined;
  }

  return adaptersByType.get(bankType);
}

export function getBankAdapter(
  payload: Pick<SyncableTransactionPayload, 'bankType'>,
): BankTransactionAdapter {
  // Deliberate back-compat default, not an oversight: transactions queued
  // before `bankType` existed (or otherwise missing it) route to banksoft —
  // see __tests__/services.test.ts's "posts older transactions without a bank
  // type to the banksoft endpoint". An explicitly-set but unrecognized
  // bankType is still rejected below.
  if (payload.bankType === undefined) {
    return adaptersByType.get(BANKSOFT) ?? banksoftAdapter;
  }

  const adapter = adaptersByType.get(payload.bankType);
  if (!adapter) {
    throw new UnsupportedBankTypeError(payload.bankType);
  }

  return adapter;
}
