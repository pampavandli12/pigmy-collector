# Pigmy Collector

An offline-first Expo / React Native app that field agents use to record daily pigmy-deposit collections, print Bluetooth thermal receipts, and share them over SMS/WhatsApp — even with no network connection at the time of collection.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture & design](#architecture--design)
- [Code structure](#code-structure)
- [Setup](#setup)
- [Running the app](#running-the-app)
- [Testing & quality](#testing--quality)
- [Configuration](#configuration)
- [Building for production](#building-for-production)

## Features

- **Agent login & multi-account support** — phone number + password login; more than one agent account can be signed in on the same device and switched between.
- **Local PIN lock** — a 6-digit app PIN gates re-entry after the app backgrounds/foregrounds, independent of the backend session.
- **Customer list & search**, with per-customer running balance and a locally cached profile photo (camera or gallery).
- **Deposit capture that works offline** — a deposit is written to a local queue immediately (optimistic balance update) and synced to the backend in the background whenever connectivity is available.
- **Multi-bank backend support** — the same deposit screen posts to different backend shapes depending on the agent's bank (`banksoft`, `peocit`, `sledger` today), without screen-level branching.
- **Deposit guardrails** — a configurable per-agent daily collection limit and a grace-period check run before a deposit can be queued.
- **Bluetooth thermal receipt printing** (ESC/POS, Android only) via a custom native Expo module, plus PDF and WhatsApp/SMS receipt sharing.
- **Proactive session management** — the access token is refreshed ahead of its own expiry instead of waiting for a request to fail, and a dead session (revoked token, 401) signs the agent out automatically.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 54, Expo Router 6 |
| UI | React Native 0.81, React 19, React Native Paper (Material Design 3) |
| Client state | `@legendapp/state` (customers, outbox, sync status) — the state model this app is built around |
| Legacy/UI-only state | `zustand` (snackbar only — not used for app data) |
| Persistence | MMKV (customers/outbox), Expo SecureStore (auth tokens, PIN), `expo-sqlite` (customer photos only) |
| Networking | Axios, with request/response interceptors for auth and token refresh |
| Validation | Zod schemas at every network and storage boundary |
| Native module | `modules/expo-thermal-printer` — custom Kotlin module for Bluetooth Classic ESC/POS printing |
| Testing | Jest (`jest-expo` preset), React Native Testing Library |
| Package manager | pnpm (required — see `packageManager` in `package.json`) |

## Architecture & design

### Auth state machine

`providers/AuthProvider.tsx` owns an `authStatus` union — `loading → unauthenticated | pinSetupRequired | locked | unlocked` (plus a `revoked` path for a deactivated agent) — and `app/_layout.tsx` gates entire route groups on it with `<Stack.Protected>`. Multiple agent accounts can be stored on one device (`services/authStorage.ts`'s per-account SecureStore map) and switched without logging out.

Token handling is **proactive**: `services/axios.ts`'s request interceptor decodes the stored access token's JWT `exp` claim (`utils/jwt.ts`) before every authenticated request and refreshes it first if it's already expired or expiring within 15 minutes (`services/authRefresh.ts`), instead of waiting for the server to reject a stale token. A 401 after that still ends the session immediately; a 403 is treated as a business/permission denial, not an auth failure, and is passed through to the caller.

The local PIN (`utils/appPin.ts`, `app/pinSetup.tsx` / `app/pinUnlock.tsx`) is a second, offline gate on top of the backend session — the app re-locks on every background → foreground transition.

### Multi-bank transaction adapters

Not every agent's backend expects the same deposit request shape. `services/banks/registry.ts` resolves a `BankTransactionAdapter` by the agent's `bankType` (`banksoft`, `peocit`, `sledger`); each adapter in `services/banks/` owns its own `endpoint`, `buildPayload`, and `toRequest` shaping, sharing only the common fields (`commonTransactionFields`). `app/userDetail.tsx` never branches on bank type itself — it just asks the registry for the right adapter. An unrecognized `bankType` raises `UnsupportedBankTypeError` and the deposit screen shows a friendly "not available for this bank yet" message instead of silently failing.

### Offline sync (the outbox model)

A deposit is never sent synchronously from the deposit screen. `store/actions.ts`'s `addTransaction` validates it, writes it to `store$.outbox` with status `pending`, and optimistically bumps the customer's shown balance — all before any network call. `store/syncEngine.ts` drains that queue (oldest first) whenever connectivity is available (triggered on app start, on `NetInfo` reconnect, and after every successful sync), calling the bank adapter's `createTransaction` for each item and advancing it through `pending → syncing → synced` or `failed` (with backoff/retry, see `store/outboxPolicy.ts`). `store/syncCoordinator.ts` guards against two sync passes running concurrently and lets callers `await` an idle queue (used before switching/logging out an agent account). A transaction that fails permanently (e.g. an unsupported bank type) reverts the optimistic balance bump it made at queue time.

### Customer photos (the one deliberate use of SQLite)

Everything above persists through MMKV via Legend State. Customer photos are the single, deliberate exception: `db/customerPhotoDb.ts` owns a small `expo-sqlite` table (keyed by bank code + account number, storing a compressed base64 image) that is fully independent of the deposit/sync model and **never throws** — a broken photo store degrades to "no photo" and can never affect a deposit. `services/customerPhoto.ts` is the only consumer-facing API; `hooks/useCustomerPhoto.ts` and `components/CustomerAvatar.tsx` are how screens read and render it.

### Receipts

`utils/ReceiptPrinter.ts` + `utils/receiptBuilder.ts` + `utils/receiptFormatter.ts` format a completed deposit into ESC/POS commands sent through the custom `expo-thermal-printer` module (`contexts/PrinterContext.tsx` / `services/BluetoothPrinterService.ts` own the Bluetooth connection lifecycle). `utils/receiptPdf.ts` and `utils/whatsappReceipt.ts` produce the same receipt as a shareable PDF/WhatsApp message for agents without a paired printer.

## Code structure

```
pigmy-collector/
├── app/                      # Expo Router screens (file-based routing)
│   ├── _layout.tsx           # Root layout: providers, route protection, global snackbar
│   ├── index.tsx             # Sign-in screen (phone number + password)
│   ├── pinSetup.tsx / pinUnlock.tsx   # Local PIN gate
│   ├── userDetail.tsx        # Deposit entry for one customer
│   ├── printer.tsx           # Bluetooth printer pairing/settings (modal)
│   └── (tabs)/                # Bottom-tab screens: dashboard, users, support
├── components/                # Reusable UI (forms, dialogs, list items, avatars)
├── contexts/                  # PrinterContext — Bluetooth printer connection state
├── providers/                  # AuthProvider — the auth/session state machine
├── hooks/                      # useCustomerPhoto, useCustomerVoiceSearch
├── services/                   # Network + native-device integrations, no React
│   ├── axios.ts, authRefresh.ts, tokenRefresh.ts, authStorage.ts, authSession.ts
│   ├── login.ts, authenticate.ts, user.ts
│   ├── banks/                  # Per-bank transaction adapters + registry
│   ├── BluetoothPrinterService.ts, customerPhoto.ts, microphonePermission.ts
├── store/                       # Legend State: observable state, persistence, sync
│   ├── store.ts, persistence.ts, selectors.ts, actions.ts
│   ├── syncEngine.ts, syncCoordinator.ts, outboxPolicy.ts, customerBalance.ts
│   └── snackbarStore.ts         # zustand — UI-only, not app data
├── db/                           # customerPhotoDb.ts — the one SQLite table
├── types/                        # Zod schemas + inferred TS types (auth, user/transaction)
├── utils/                         # Constants, routes, receipts, deposit rules, JWT decode
├── modules/expo-thermal-printer/  # Custom native Expo module (Android Kotlin + JS bridge)
└── __tests__/                      # Jest test suite
```

See [AGENTS.md](AGENTS.md) for the condensed contributor-facing contract (folder conventions, coding style, commit/PR notes) and [CLAUDE.md](CLAUDE.md) for AI-assistant-specific command and architecture notes.

## Setup

### Prerequisites

- Node.js 20+ and **pnpm** (`packageManager: pnpm@12.6.0` — don't use npm/yarn, the lockfile and `postinstall` patch step assume pnpm)
- Java 17 (JDK) and Android Studio (SDK + an emulator, or a USB-debugging-enabled device) for Android
- Xcode (macOS only) for iOS

### Install

```bash
pnpm install
```

`postinstall` runs `patch-package` automatically — this repo ships patches under `patches/` (e.g. for `expo-dev-client`'s Gradle compatibility) that **must** survive any dependency bump; if you upgrade a patched package, regenerate its patch rather than discarding it.

## Running the app

**Expo Go will not work** — the custom `expo-thermal-printer` native module requires a development client or a full native build.

```bash
pnpm run android   # first run: builds and installs a dev client, then starts Metro
pnpm run ios        # macOS only
pnpm start          # subsequent runs, once a dev client is already installed
```

If native code or a patched dependency changes, do a clean rebuild:

```bash
cd android && ./gradlew clean && cd ..
pnpm run android
```

## Testing & quality

```bash
pnpm run typecheck        # tsc --noEmit (strict mode, @/* root alias)
pnpm run lint              # expo lint — run before handoff
pnpm test                  # Jest, run in band
pnpm test:coverage         # coverage over app/components/contexts/hooks/providers/services/store/utils
npx jest __tests__/foo.test.ts -t "test name"   # a single file / test
```

`jest.setup.ts` mocks every native dependency the app touches (MMKV, SecureStore, NetInfo, the thermal printer module, etc.) — when a change introduces a new native dependency, add its mock there or tests using it will fail for reasons unrelated to your change.

## Configuration

All endpoints, SecureStore keys, and the MMKV encryption key live in `utils/constants.ts` (route-matching helpers in `utils/apiRoutes.ts`). The API base URL is resolved once at startup (`resolveApiBaseUrl`) from `EXPO_PUBLIC_API_BASE_URL`:

- **Development**: falls back to `http://10.0.2.2:1010` (Android emulator loopback) or `http://localhost:1010` (iOS simulator) if the env var isn't set.
- **Production**: the env var is required and **must** be an `https://` URL — the app throws at startup otherwise.

## Building for production

```bash
pnpm add -g eas-cli   # once
eas build --platform android --profile production
```

---

Built with [Expo](https://expo.dev) and [React Native Paper](https://callstack.github.io/react-native-paper/). Bluetooth printing is implemented locally in `modules/expo-thermal-printer` (Android Bluetooth Classic / ESC-POS only).
