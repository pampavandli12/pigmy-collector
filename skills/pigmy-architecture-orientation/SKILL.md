---
name: pigmy-architecture-orientation
description: Orient Codex to the Pigmy Collector repository architecture before broad or cross-cutting changes. Use when a task asks for project understanding, architecture review, onboarding, refactoring across app/store/services/components, or when the right ownership boundary is unclear.
---

# Pigmy Architecture Orientation

## Read First

Start with `AGENTS.md`, then inspect only files relevant to the requested change. For broad orientation, read:

- `app/_layout.tsx` for provider order, protected routing, theme, and global snackbar placement.
- `app/(tabs)/_layout.tsx` for tab navigation and reconnect sync behavior.
- `providers/AuthProvider.tsx` for SecureStore auth state and `useAuth`.
- `contexts/PrinterContext.tsx` for `usePrinter` and native printer event handling.
- `store/store.ts`, `store/actions.ts`, `store/selectors.ts`, and `store/syncEngine.ts` for local-first data flow.
- `services/axios.ts`, `services/user.ts`, and `services/login.ts` for API boundaries.

## Architecture Model

Treat screens as orchestration/rendering layers. Keep business actions in `store/actions.ts`, derived reads in `store/selectors.ts`, API calls in `services/`, reusable UI in `components/`, and native/device adapters behind context or service modules.

Current data path:

1. Auth user loads from SecureStore and is validated with Zod.
2. Customer fetches go through `services/user.ts`.
3. Customer and outbox state live in Legend State and persist to MMKV.
4. Screens subscribe through `useSelector`.
5. Deposits enter the outbox immediately and sync asynchronously.

## Boundaries To Preserve

- Do not bypass `actions.addTransaction` for new deposit flows.
- Do not place Axios calls directly in screens.
- Do not assume SQLite is active; it is installed but unused.
- Do not use Expo Go for native-printer validation.
