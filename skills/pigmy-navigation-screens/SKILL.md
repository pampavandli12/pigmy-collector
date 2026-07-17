---
name: pigmy-navigation-screens
description: Work with Pigmy Collector Expo Router screens, protected stacks, bottom navigation tabs, route params, app/_layout.tsx, app/(tabs), app/userDetail.tsx, app/printer.tsx, or adding/changing screens.
---

# Pigmy Navigation Screens

## Files To Inspect

- `app/_layout.tsx`: protected root stack and provider wrapper.
- `app/(tabs)/_layout.tsx`: React Native Paper bottom navigation and tab scenes.
- `app/index.tsx`: unauthenticated login route.
- `app/(tabs)/users.tsx`: customer list and `/userDetail` navigation params.
- `app/userDetail.tsx`: deposit route consuming params.
- `app/printer.tsx`: printer route and optional redirect-back behavior.

## Working Rules

Use Expo Router paths and params. Keep auth gating in `app/_layout.tsx`; do not duplicate guard logic inside individual screens unless a screen has additional requirements.

Prefer small route files that orchestrate state and compose reusable components. Move reusable UI into `components/`, shared actions into `store/actions.ts`, API calls into `services/`, and cross-screen state into providers/contexts or Legend State.

## Patterns

The active tabs are Home, Users, and Support. Users pushes `/userDetail` with customer fields as route params. Transaction success may push `/printer` with `redirectBack=true` when a receipt print requires connection setup.

## Verification

Verify deep navigation after login, back behavior from detail/printer screens, and tab state after auth changes.
