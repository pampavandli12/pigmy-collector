---
name: pigmy-state-selectors
description: Work with Pigmy Collector derived state, dashboard totals, customer filtering/search, Legend State computed selectors, useSelector usage, or changes to store/selectors.ts and read-only state consumption in screens.
---

# Pigmy State Selectors

## Files To Inspect

- `store/store.ts`: observable source state.
- `store/selectors.ts`: computed read models.
- `app/(tabs)/dashboard.tsx`: today’s totals/counts/transactions.
- `app/(tabs)/users.tsx`: filtered customers and search query.
- `types/user.ts`: customer and transaction shapes.

## Working Rules

Put reusable derived data in `store/selectors.ts`; avoid recalculating shared totals or filters inside screens. Use `useSelector` from `@legendapp/state/react` to subscribe to observables or computed selectors.

Keep selectors side-effect free. Mutations belong in `store/actions.ts` or a service. Prefer stable, typed read models and avoid coupling selectors to UI formatting unless the formatting is genuinely shared.

## Current Selectors

The existing read models include filtered customers, today’s transactions, today’s collection amount, today’s transaction count, and total customer count. Today-based selectors derive from outbox `createdAt`, not from remote server state.

## Verification

Verify search by customer name and account number, dashboard totals after a new local deposit, empty states, and date-bound behavior around today’s transactions.
