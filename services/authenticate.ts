/**
 * Re-verifies an already-logged-in agent against the backend (per-agent
 * `limitAmount`, `lastDepositDate`, `graceDays`, and revocation status).
 * Called on unlock/foreground, not at initial login.
 */
import { authenticateMeResponseSchema } from "@/types/auth";
import { API_ENDPOINTS } from "@/utils/constants";
import { api } from "./axios";

export async function authenticateAgent(phoneNumber: string) {
  const response = await api.get(API_ENDPOINTS.AUTHENTICATE_ME, {
    params: { phoneNumber },
  });
  return authenticateMeResponseSchema.parse(response.data);
}
