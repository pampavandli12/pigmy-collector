# Repository Guidelines

This is the primary, self-contained contract for working in this repo. Other AI-assistant files
(`CLAUDE.md`) add tool-specific command notes and defer to this file for architecture — if they
ever disagree with the code, trust the code and fix the doc.

## What this app is

An offline-first Expo / React Native app field agents use to record daily pigmy-deposit
collections, print Bluetooth thermal receipts, and share them over SMS/WhatsApp — even with no
network connection at the time of collection. See [README.md](README.md) for the full feature
list and tech-stack table.

## Architecture & Data Flow

`app/_layout.tsx` wires React Native Paper, `PrinterProvider`, `AuthProvider`, protected routes
(`<Stack.Protected>`), and `AppSnackbar`. Login stores a validated auth user in SecureStore via
`services/authStorage.ts`. API calls go through `services/axios.ts`, which decodes the stored
JWT, proactively refreshes it before it expires, injects the token, and logs out through
`services/authSession.ts` on a `403` (see "Auth & session state machine" below).

Customer data flows from `services/user.ts` into Legend State via `store/actions.ts`. Screens
read derived state from `store/selectors.ts` with `useSelector`. New deposits are created in
`app/userDetail.tsx` — after `utils/collectionLimit.ts` and `utils/gracePeriod.ts` clear it —
queued through `actions.addTransaction`, shown immediately on the dashboard via an optimistic
balance bump, and synced later by `store/syncEngine.ts` through the bank-specific adapter
resolved from `services/banks/registry.ts`.

## Folder Organization

- `app/`: Expo Router screens and route layouts (file-based routing).
  - `_layout.tsx` — root layout: providers, route protection, global snackbar.
  - `index.tsx` — sign-in screen (phone number + password).
  - `pinSetup.tsx` / `pinUnlock.tsx` — local PIN gate screens.
  - `userDetail.tsx` — deposit entry for one customer.
  - `printer.tsx` — Bluetooth printer pairing/settings (modal).
  - `(tabs)/` — bottom-tab screens: `dashboard`, `users`, `support` (there is no "reports" tab;
    ignore any older doc that mentions one).
- `components/`: reusable UI — `TransactionForm`, `TransactionSuccess`, `PrinterManager`,
  `AppSnackbar`, `AgentAccountSwitcher`, `CustomerAvatar`, `CustomerListItem`, `ErrorBoundary`,
  `PhotoPreviewModal`, `PhotoSourceDialog`, `PinScreenLayout`, `SessionFallbackDialog`.
- `providers/`: `AuthProvider.tsx` — the auth/session state machine.
- `contexts/`: `PrinterContext.tsx` — Bluetooth printer connection state (`usePrinter()`).
- `hooks/`: `useCustomerPhoto.ts`, `useCustomerVoiceSearch.ts`.
- `services/`: API and native-device adapters; keep network and Bluetooth calls out of screens.
  - `axios.ts`, `authRefresh.ts`, `tokenRefresh.ts`, `authStorage.ts`, `authSession.ts`,
    `requestAuthHeaders.ts` — auth/session/token plumbing.
  - `login.ts`, `authenticate.ts`, `user.ts` — login and agent/customer data fetching.
  - `banks/` — per-bank transaction adapters (`banksoft.ts`, `peocit.ts`, `sledger.ts`),
    `registry.ts`, `types.ts`, `errors.ts`.
  - `BluetoothPrinterService.ts`, `customerPhoto.ts`, `microphonePermission.ts`.
- `store/`: local observable state, persistence, selectors, and sync orchestration — see
  "State, Offline Sync & SQLite" below.
- `db/`: `customerPhotoDb.ts` — the one deliberate SQLite table.
- `types/`: `auth.ts`, `user.ts` — Zod schemas and inferred TS types.
- `utils/`: constants/routes, PIN, deposit-rule evaluators (`collectionLimit.ts`,
  `gracePeriod.ts`), JWT decode, snackbar helper, and receipt helpers (`ReceiptPrinter.ts`,
  `receiptBuilder.ts`, `receiptFormatter.ts`, `receiptPdf.ts`, `whatsappReceipt.ts`).
- `modules/expo-thermal-printer/`: custom native Expo module; Android Kotlin backs Bluetooth
  printing.
- `__tests__/`: Jest test suite (see "Development & Testing Workflow").

## Auth & session state machine

`providers/AuthProvider.tsx` owns an `authStatus` union: `loading → unauthenticated |
pinSetupRequired | locked | unlocked` (plus a `revoked` path for a deactivated agent).
`app/_layout.tsx` gates entire route groups on this with `<Stack.Protected>` — `index` (login)
when unauthenticated, `pinSetup`/`pinUnlock` for the local PIN gate, and `(tabs)`/`userDetail`/
`printer` only when authenticated **and** unlocked. More than one agent account can be stored on
one device (`services/authStorage.ts`'s per-account SecureStore map) and switched without
logging out (`components/AgentAccountSwitcher.tsx`).

Token handling is **proactive**: `services/axios.ts`'s request interceptor decodes the stored
access token's JWT `exp` claim (`utils/jwt.ts`) before every authenticated request and refreshes
it first via `services/authRefresh.ts` if it's already expired or expiring within 15 minutes,
instead of waiting for the server to reject a stale token. A `401` after that still ends the
session immediately (`services/authSession.ts`); a `403` is a business/permission denial, not an
auth failure, and is passed through to the caller. `services/authenticate.ts`'s
`AUTHENTICATE_ME` response carries per-agent `limitAmount`, `lastDepositDate`, `graceDays`, and
revocation state, consumed by the deposit-limit checks below.

The local PIN (`utils/appPin.ts`, `app/pinSetup.tsx` / `app/pinUnlock.tsx`,
`components/PinScreenLayout.tsx`) is a second, offline gate on top of the backend session — the
app re-locks on every background → foreground transition.

## Multi-bank transaction adapters

Not every agent's backend expects the same deposit request shape. `services/banks/registry.ts`
resolves a `BankTransactionAdapter` by the agent's `bankType` (`banksoft`, `peocit`, `sledger`
today); `getBankAdapter` falls back to `banksoft` when `bankType` is undefined. Each adapter in
`services/banks/` owns its own `endpoint`, `buildPayload`, and `toRequest` shaping, sharing only
the common fields (`commonTransactionFields` in `services/banks/types.ts`). `app/userDetail.tsx`
never branches on bank type itself — it just asks the registry for the right adapter. An
unrecognized `bankType` raises `UnsupportedBankTypeError` (`services/banks/errors.ts`) and the
deposit screen shows a friendly "not available for this bank yet" message instead of silently
failing — and a permanently-failed sync for this reason is never auto-retried (see
`store/outboxPolicy.ts`).

When adding a bank: implement the `BankTransactionAdapter` interface in `services/banks/`,
register it in the `adapters` array in `registry.ts`, and keep shared fields in
`commonTransactionFields` rather than duplicating them per adapter.

## Deposit limits & grace period

Before a deposit can be queued, `app/userDetail.tsx` runs two independent, fail-open checks
against data from the authenticate response:

- `utils/collectionLimit.ts` (`evaluateCollectionLimit`) — the agent's per-agent daily
  collection limit (`limitAmount`) vs. today's already-collected amount. A missing/invalid
  limit means no limit is enforced (fails open), so bad or absent backend data never blocks a
  deposit.
- `utils/gracePeriod.ts` (`evaluateGracePeriod`) — the agent's grace-period deadline
  (`lastDepositDate` + `graceDays`). Only a positively computed, elapsed deadline blocks a
  deposit; missing/unparseable data fails open.

Respect both when touching deposit creation in `app/userDetail.tsx`.

## State, Offline Sync & SQLite

Primary app state uses `@legendapp/state` in `store/store.ts`. `customers` and `outbox` persist
to MMKV through `store/persistence.ts`; `store/selectors.ts` computes filtered customers
(`filteredCustomers$`), today's transactions and totals (`todaysTransactions$`,
`todaysCollectionAmount$`, `todaysTransactionCount$`), and customer counts
(`totalCustomerCount$`). `zustand` (`store/snackbarStore.ts`) is used only for the global
snackbar — it holds no app data; prefer Legend State for anything customer- or
transaction-related.

Offline sync is outbox-based. `store/actions.ts`'s `addTransaction` validates a deposit,
writes it to `store$.outbox` with status `pending`, and optimistically bumps the customer's
shown balance via `store/customerBalance.ts` (`updateCustomerBalanceForToday`) — all before any
network call. `store/syncEngine.ts` drains that queue (oldest first) whenever connectivity is
available (triggered on app start, on `NetInfo` reconnect, and after every successful sync),
calling the resolved bank adapter's `createTransaction` for each item and advancing it through
`pending → syncing → synced` or `failed`, with retry/backoff policy in `store/outboxPolicy.ts`
(`isValidOutboxItem`, exponential `retryDelayMs` up to `MAX_AUTO_RETRIES`, and permanent-vs-
retryable failure classification — e.g. `UnsupportedBankTypeError` never auto-retries).
`store/syncCoordinator.ts` (`beginOutboxSync`, `takeOutboxRerun`, `endOutboxSync`,
`waitForOutboxIdle`) guards against two sync passes running concurrently and lets callers
`await` an idle queue (used before switching/logging out an agent account). A transaction that
fails permanently reverts its optimistic balance bump via
`revertCustomerBalanceForFailedTransaction`.

`expo-sqlite` is used, deliberately, for exactly one thing: customer photos, kept fully
independent of the MMKV/Legend-State model above. `db/customerPhotoDb.ts` owns the
`customer_photos` table (keyed by `(bank_code, account_number)`, storing a compressed photo as
base64 TEXT) and never throws — a DB-open or query failure resolves to `null`/`{}` so a broken
photo store can never affect deposits or sync. `services/customerPhoto.ts` is the only
consumer-facing API (save/get/get-batch), and `hooks/useCustomerPhoto.ts` +
`components/CustomerAvatar.tsx` are how screens read and display it. Do not store anything else
in SQLite, and do not assume SQLite persistence for other state, without the same explicit,
documented decision.

## Receipts & printing

`utils/ReceiptPrinter.ts` (the API screens call) + `utils/receiptBuilder.ts` +
`utils/receiptFormatter.ts` format a completed deposit into ESC/POS commands sent through the
custom `expo-thermal-printer` module via `services/BluetoothPrinterService.ts`.
`contexts/PrinterContext.tsx` (`usePrinter()`) owns the Bluetooth connection lifecycle
(scan/pair/connect/disconnect) consumed by `components/PrinterManager.tsx` and `app/printer.tsx`.
`utils/receiptPdf.ts` and `utils/whatsappReceipt.ts` produce the same receipt as a shareable
PDF/WhatsApp message for agents without a paired printer. See
[PRINTER_README.md](PRINTER_README.md) for the printer-module API reference in more detail.

## Navigation & Reusable Patterns

Use Expo Router paths and params: Users pushes `/userDetail`, printer setup uses `/printer`
(modal), and authenticated access is enforced in the root stack (see "Auth & session state
machine"). Keep screens focused on rendering and orchestration; put form UI in `components/`,
shared actions in `store/actions.ts`, API calls in `services/`, and printer formatting in
`utils/ReceiptPrinter.ts`.

## Coding Style & Naming

Use strict TypeScript and the `@/*` root alias. Follow existing React Native Paper styling and
functional components. Route files are lowercase or route-shaped (`dashboard.tsx`,
`userDetail.tsx`), reusable components are `PascalCase.tsx`, stores are `*Store.ts` (legacy
zustand only) or live under `store/` for Legend State, and services are named after the
integration/resource. Keep endpoints and storage keys in `utils/constants.ts` (route-matching
helpers in `utils/apiRoutes.ts`). Validate at every network and storage boundary with Zod
schemas from `types/`.

## Development & Testing Workflow

This repo uses **pnpm** (`packageManager: pnpm@12.6.0`), not npm/yarn. Run `pnpm install` after
dependency changes — `postinstall` runs `patch-package` automatically; patches under `patches/`
must survive dependency bumps.

- `pnpm start` — Metro/Expo dev server.
- `pnpm run android` / `pnpm run ios` — native dev builds. **Expo Go will not work** because of
  the custom `expo-thermal-printer` native module; use a dev client or a full native build.
- `pnpm run typecheck` — `tsc --noEmit` (strict mode).
- `pnpm run lint` — ESLint (expo config). Run before handoff.
- `pnpm test` — Jest (`jest-expo` preset, run in band). Single file:
  `npx jest __tests__/syncEngine.test.ts`; single test: add `-t "name substring"`.
- `pnpm run test:coverage` — coverage over `app`, `components`, `contexts`, `hooks`,
  `providers`, `services`, `store`, `utils`.

`jest.setup.ts` mocks every native dependency the app touches (MMKV, SecureStore, NetInfo, the
thermal printer module, etc.) — when a change introduces a new native dependency, add its mock
there or tests using it will fail for reasons unrelated to the change. Beyond the automated
suite, manually verify login, customer refresh/search, deposit creation, offline retry after
reconnect, SMS/WhatsApp handoff, and physical printer connect/print flows before a release —
those paths depend on real Bluetooth/native behavior the test suite mocks out.

## Config & constants

Endpoints, SecureStore keys, and the MMKV encryption key live in `utils/constants.ts` (routes
also in `utils/apiRoutes.ts`). API base URL comes from `EXPO_PUBLIC_API_BASE_URL` via
`resolveApiBaseUrl`: dev falls back to `10.0.2.2:1010` (Android emulator) / `localhost:1010`
(iOS simulator), and production **requires** an `https://` URL (throws at startup otherwise).

## Other docs in this repo

- [README.md](README.md) — full feature list, tech stack, setup/build instructions; the
  human-facing front door.
- [CLAUDE.md](CLAUDE.md) — Claude-Code-specific command notes; defers to this file for
  architecture.
- [PRINTER_README.md](PRINTER_README.md) — detailed Bluetooth printer module API reference.
- `BUILD_GUIDE.md`, `ERROR_FIX.md`, `PAPER_SETUP.md`, `NAVIGATION.md` — historical setup notes
  from earlier in the project's life. Treat the architecture/command guidance in this file and
  README.md as authoritative if they ever disagree.

## Commit & PR Notes

History uses short imperative commits, sometimes with Conventional Commit prefixes such as
`feat:` and `refactor:`. Keep changes focused. PRs should summarize affected flows, mention
manual verification, link issues when relevant, and include screenshots or recordings for UI
changes.
