/**
 * Identifies the unauthenticated "public auth" endpoints (login, token
 * refresh) that `services/axios.ts`'s interceptors must never attach an
 * Authorization header to or run proactive-refresh/401 handling against.
 */
import { API_ENDPOINTS } from '@/utils/constants';

const PUBLIC_AUTH_ROUTES = new Set<string>([
  API_ENDPOINTS.LOGIN,
  API_ENDPOINTS.REFRESH_TOKEN,
]);

export function isPublicAuthRoute(url?: string) {
  if (!url) return false;

  const normalized = url.split('?')[0];
  return PUBLIC_AUTH_ROUTES.has(normalized);
}
