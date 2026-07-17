---
name: pigmy-api-auth
description: Work with Pigmy Collector API calls, auth persistence, login/logout behavior, Axios interceptors, token handling, 403 session expiry, endpoints, or files under services/ and providers/AuthProvider.tsx.
---

# Pigmy API Auth

## Files To Inspect

- `providers/AuthProvider.tsx`: `useAuth`, SecureStore load/save/delete, Zod validation, unauthorized handler registration.
- `services/axios.ts`: base URL, auth header injection, response interceptor, `403` logout path.
- `services/authSession.ts`: global unauthorized callback bridge.
- `services/login.ts`: login request shape.
- `services/user.ts`: customer and transaction endpoints.
- `types/auth.ts`: strict `authUserSchema`.
- `utils/constants.ts`: API base URL, endpoints, storage key.

## Working Rules

Keep authentication state authoritative in `AuthProvider`; avoid duplicating token state elsewhere. Validate persisted auth data with `authUserSchema` before trusting it. Route all HTTP calls through `api` from `services/axios.ts` so token injection and `403` handling remain consistent.

When adding endpoints, define the path in `utils/constants.ts` and wrap the call in a service module. Screens should call store actions or service helpers, not construct raw Axios requests.

## Verification

Verify successful login, persisted reload behavior, logout, and a simulated or observed `403` path that clears SecureStore and returns the app to unauthenticated state.
