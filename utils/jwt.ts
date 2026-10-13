/**
 * Decodes a JWT access token's payload client-side (no signature
 * verification — the server is the source of truth for that) so
 * `services/authRefresh.ts` can read the `exp` claim and refresh proactively
 * before the token actually expires.
 */
// Hermes (this app's JS engine) doesn't reliably provide global atob/Buffer,
// so this decodes base64url by hand instead of relying on either — it behaves
// identically in Jest (Node) and on-device.
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) return null;
    const decoded = base64UrlDecode(segments[1]);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  return exp * 1000;
}
