# Repository Guidelines

## Architecture & Data Flow

This Expo Router app handles authenticated customer lookup, local transaction capture, offline retry, SMS, and Bluetooth receipt printing. `app/_layout.tsx` wires React Native Paper, `PrinterProvider`, `AuthProvider`, protected routes, and `AppSnackbar`. Login stores a validated auth user in SecureStore. API calls go through `services/axios.ts`, which injects the stored token and logs out through `authSession` on `403`.

Customer data flows from `services/user.ts` into Legend State via `store/actions.ts`. Screens read derived state from `store/selectors.ts` with `useSelector`. New deposits are created in `app/userDetail.tsx`, queued through `actions.addTransaction`, shown immediately on the dashboard, and synced later by `store/syncEngine.ts`.

## Folder Organization

- `app/`: Expo Router screens and route layouts. `(tabs)` contains Home, Users, and Support.
- `components/`: reusable UI such as `TransactionForm`, `TransactionSuccess`, `PrinterManager`, and `AppSnackbar`.
- `providers/` and `contexts/`: app-level React state and hooks: `useAuth`, `usePrinter`.
- `services/`: API and native-device adapters; keep network and Bluetooth calls out of screens.
- `store/`: local observable state, persistence, selectors, and sync orchestration.
- `types/`: shared TypeScript and Zod-backed models.
- `utils/`: constants, snackbar helper, and receipt-print helpers.
- `modules/expo-thermal-printer/`: custom native Expo module; Android Kotlin backs Bluetooth printing.

## State, Offline Sync & SQLite

Primary app state uses `@legendapp/state` in `store/store.ts`. `customers` and `outbox` persist to MMKV through `store/persistence.ts`; selectors compute filtered customers, today’s transactions, totals, and counts. `zustand` remains for snackbar state and an older `userStore`; prefer Legend State for customer and transaction work.

Offline sync is outbox-based. Transactions are stored by `transactionId` with `pending`, `syncing`, `failed`, or `synced` status. `processOutbox` checks NetInfo, syncs oldest first, and retries failed items. The tab layout triggers sync and cleanup when connectivity returns. `expo-sqlite`, `DB_NAME`, and `TABLE_NAME` exist, but there is no active SQLite schema or query layer; do not assume SQLite persistence unless adding it intentionally.

## Navigation & Reusable Patterns

Use Expo Router paths and params: Users pushes `/userDetail`, printer setup uses `/printer`, and authenticated access is enforced in the root stack. Keep screens focused on rendering and orchestration; put form UI in `components/`, shared actions in `store/actions.ts`, API calls in `services/`, and printer formatting in `utils/ReceiptPrinter.ts`.

## Coding Style & Naming

Use strict TypeScript and the `@/*` root alias. Follow existing React Native Paper styling and functional components. Route files are lowercase or route-shaped (`dashboard.tsx`, `userDetail.tsx`), reusable components are `PascalCase.tsx`, stores are `*Store.ts`, and services are named after the integration/resource. Keep endpoints and storage keys in `utils/constants.ts`.

## Development & Testing Workflow

Run `npm install` after dependency changes, `npm start` for Metro, `npm run android` or `npx expo run:android` for Android builds, and `npm run lint` before handoff. Expo Go is not sufficient because of the custom Bluetooth module. No automated test script is configured; manually verify login, customer refresh/search, deposit creation, offline retry after reconnect, SMS handoff, and physical printer connect/print flows.

## Commit & PR Notes

History uses short imperative commits, sometimes with Conventional Commit prefixes such as `feat:` and `refactor:`. Keep changes focused. PRs should summarize affected flows, mention manual verification, link issues when relevant, and include screenshots or recordings for UI changes.
