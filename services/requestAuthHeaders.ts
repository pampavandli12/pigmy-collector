export interface RequestAuthContext {
  token: string;
  accountId: string;
  bankType?: string;
}

// Every non-login request carries the agent's access token and, when known,
// the bank type — kept as a pure function (no axios import) so it can be unit
// tested without instantiating the real axios instance.
export function applyAuthHeaders(
  headers: Record<string, string | undefined>,
  auth: RequestAuthContext | null,
) {
  delete headers.Authorization;
  delete headers.bankType;

  if (auth) {
    headers.Authorization = auth.token;
    if (auth.bankType) {
      headers.bankType = auth.bankType;
    }
  }
}
