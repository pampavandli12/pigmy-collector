# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

[AGENTS.md](AGENTS.md) is the primary contract for this repo (architecture, data flow, folder conventions, coding style, offline-sync model, commit/PR notes). Follow it. This file adds the commands and the architecture pieces that AGENTS.md predates.

## Commands

This repo uses **pnpm** (`packageManager: pnpm@12.6.0` in package.json), not npm/yarn.

- `pnpm start` — Metro / Expo dev server.
- `pnpm run android` / `pnpm run ios` — native dev builds. **Expo Go will not work** because of the custom `expo-thermal-printer` native module; use a dev client (`expo-dev-client`) or a native build.
- `pnpm run lint` — ESLint (expo config). Run before handoff.
- `pnpm run typecheck` — `tsc --noEmit`. Strict TypeScript; the `@/*` alias maps to the repo root.
- `pnpm test` — Jest (`jest-expo`, run in band).
- Single file: `npx jest __tests__/syncEngine.test.ts`. Single test: add `-t "name substring"`.
- `pnpm run test:coverage` — coverage (collected from `app`, `components`, `contexts`, `hooks`, `providers`, `services`, `store`, `utils`).
- `pnpm install` runs `patch-package` via `postinstall`; `patches/` overrides must survive dependency bumps.

`jest.setup.ts` mocks native modules (MMKV, SecureStore, NetInfo, thermal printer, etc.); when a test touches a new native dependency, add its mock there.

## Auth & session state machine

`providers/AuthProvider.tsx` drives navigation via an `authStatus` union: `loading → unauthenticated | pinSetupRequired | locked | unlocked` (plus a `revoked` path). `app/_layout.tsx` gates route groups on these with `<Stack.Protected>` — `index` (login) when unauthenticated, `pinSetup`/`pinUnlock` for the local PIN gate, and `(tabs)`/`userDetail`/`printer` only when authenticated **and** unlocked.

Layers under `services/`:
- `login.ts` / `authenticate.ts` — login and agent authentication (`AUTHENTICATE_ME` returns per-agent `limitAmount`, `lastDepositDate`, `graceDays`, and revocation).
- `authStorage.ts` — validated auth user in SecureStore; `authSession.ts` — logout on `403` (wired through `services/axios.ts`, which injects the token).
- `authRefresh.ts` / `tokenRefresh.ts` — token refresh flow.
- App-local PIN lock lives in `utils/appPin.ts` (+ `pinSetup.tsx` / `pinUnlock.tsx`); the app re-locks on background/foreground transitions.

## Multi-bank transaction adapters

Deposits are bank-type aware. `services/banks/registry.ts` resolves a `BankTransactionAdapter` by `bankType` (currently `banksoft` and `peocit`); each adapter owns its `endpoint`, `buildPayload`, and `toRequest` shaping. Unknown types raise `UnsupportedBankTypeError`. When adding a bank, implement the `BankTransactionAdapter` interface in `services/banks/`, register it in the `adapters` array, and keep shared fields in `commonTransactionFields`. `getBankAdapter` falls back to `banksoft` when `bankType` is undefined.

## Deposit limits

Before queuing a deposit, `utils/collectionLimit.ts` (`evaluateCollectionLimit`) and `utils/gracePeriod.ts` (`evaluateGracePeriod`) validate the agent's per-agent limit and grace window from the authenticate response. Respect both when touching deposit creation in `app/userDetail.tsx`.

## Sync coordination

Beyond the outbox model in AGENTS.md, `store/syncCoordinator.ts` guards concurrent runs (`beginOutboxSync`, `takeOutboxRerun`, `endOutboxSync`, `waitForOutboxIdle`) so `store/syncEngine.ts` never double-processes and callers can await idle.

## Config & constants

Endpoints, SecureStore keys, and the MMKV encryption key live in `utils/constants.ts` (routes also in `utils/apiRoutes.ts`). API base URL comes from `EXPO_PUBLIC_API_BASE_URL` via `resolveApiBaseUrl`: dev falls back to `10.0.2.2:1010` (Android emulator) / `localhost:1010`, and production **requires** an `https://` URL (throws otherwise).
