/** Thrown by `services/banks/registry.ts` for a `bankType` with no registered adapter; checked via `isUnsupportedBankTypeError` to mark an outbox failure as permanent (never auto-retried). */
export class UnsupportedBankTypeError extends Error {
  readonly bankType: string;

  constructor(bankType: string) {
    super(`Unsupported bank type: ${bankType}`);
    this.name = 'UnsupportedBankTypeError';
    this.bankType = bankType;
  }
}

export function isUnsupportedBankTypeError(
  error: unknown,
): error is UnsupportedBankTypeError {
  return (
    error instanceof UnsupportedBankTypeError ||
    (error instanceof Error && error.name === 'UnsupportedBankTypeError')
  );
}
