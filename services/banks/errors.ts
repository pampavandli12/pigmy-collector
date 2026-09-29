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
