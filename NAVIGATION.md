# Navigation Structure

> This file is a quick route map. For the auth gating that controls which of these routes is
> reachable, see "Auth & session state machine" in [AGENTS.md](AGENTS.md). For how deposits flow
> out of `userDetail`, see "State, Offline Sync & SQLite" there.

## Route tree

```
/                          app/index.tsx          sign-in (phone number + password)
/pinSetup                  app/pinSetup.tsx       create local PIN (first unlock after login)
/pinUnlock                 app/pinUnlock.tsx      enter local PIN (re-lock on foreground)
/(tabs)/dashboard          app/(tabs)/dashboard.tsx   today's totals, printer status, quick actions
/(tabs)/users              app/(tabs)/users.tsx       customer list/search -> /userDetail
/(tabs)/support            app/(tabs)/support.tsx     support/help screen
/userDetail                app/userDetail.tsx     deposit entry for one customer (pushed from users)
/printer                   app/printer.tsx        Bluetooth printer pairing/settings (modal)
```

There is no "reports" tab — an earlier version of this app had one with mock data; it was
removed. The current tab bar is `dashboard`, `users`, `support` only
(`app/(tabs)/_layout.tsx`).

## Route protection

`app/_layout.tsx` wraps route groups in `<Stack.Protected>` keyed off `AuthProvider`'s
`authStatus`:

- `unauthenticated` → only `index` is reachable.
- `pinSetupRequired` → only `pinSetup` is reachable.
- `locked` → only `pinUnlock` is reachable.
- `unlocked` → `(tabs)`, `userDetail`, and `printer` are reachable.

Login is real (`services/login.ts` / `services/authenticate.ts` against the backend) — this is
not mock authentication, and the user list comes from `services/user.ts`, not sample data.

## Styling

React Native Paper (Material Design 3) throughout; see [PAPER_SETUP.md](PAPER_SETUP.md) for the
original theme/font setup notes.
