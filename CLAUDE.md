# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

[AGENTS.md](AGENTS.md) is the primary, self-contained contract for this repo: architecture, data
flow, folder conventions, coding style, the offline-sync model, the auth/PIN state machine,
multi-bank adapters, deposit limits, config, and commit/PR notes. Read it before making changes.
This file only adds the command reference below — it does not duplicate the architecture notes,
so if something here looks stale, AGENTS.md (and the code) wins.

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
