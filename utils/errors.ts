/** Extracts a user-displayable message from a caught error, falling back to a given default for non-Error throws or blank messages. */
export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
