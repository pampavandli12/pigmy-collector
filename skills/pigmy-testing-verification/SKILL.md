---
name: pigmy-testing-verification
description: Verify Pigmy Collector changes before handoff, especially because no automated test script exists. Use for lint/build/manual QA planning around login, customer sync, offline transactions, navigation, SMS, and Bluetooth printer flows.
---

# Pigmy Testing Verification

## Baseline Commands

Run `npm run lint` before handoff when dependencies are installed. Use `npm start` for Metro and `npm run android` or `npx expo run:android` for native Android verification. Do not rely on Expo Go for printer-related changes.

## Manual QA Matrix

Choose the relevant checks for the changed area:

- Auth/API: login, persisted session reload, logout, and `403` expiry handling.
- Customers: refresh, offline behavior, search by name/account number, empty state.
- Transactions: amount mismatch validation, scheme selection, local success, dashboard totals.
- Offline sync: create while offline, reconnect, retry pending/failed outbox items, avoid duplicates.
- Navigation: protected routes, tab switching, `/userDetail` params, `/printer` redirect-back.
- Printer: permissions, Bluetooth enabled flow, scan, pair, connect, disconnect, test print, receipt print.
- SMS: availability check and message handoff.

## Handoff Notes

Report which commands ran and which manual flows were verified. If a flow cannot be tested, name the missing condition, such as no physical Android device or no Bluetooth printer.
