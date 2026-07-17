---
name: pigmy-transaction-ui
description: Work with Pigmy Collector deposit entry, transaction confirmation, transaction success, amount validation, SMS handoff, receipt print handoff, app/userDetail.tsx, components/TransactionForm.tsx, or components/TransactionSuccess.tsx.
---

# Pigmy Transaction UI

## Files To Inspect

- `app/userDetail.tsx`: route params, local form state, transaction payload construction, `actions.addTransaction`.
- `components/TransactionForm.tsx`: amount/reconfirm UI, scheme picker, confirm button state.
- `components/TransactionSuccess.tsx`: success summary, SMS send, print receipt flow.
- `types/user.ts`: `TransactionPayload`.
- `utils/ReceiptPrinter.ts`: receipt data shape and print helper.
- `contexts/PrinterContext.tsx`: connection status used by success UI.

## Working Rules

Keep the transaction capture path local-first. On confirm, build a complete `TransactionPayload` with a unique `transactionId`, then call `actions.addTransaction`. Do not wait for remote sync before showing success.

Preserve amount confirmation behavior unless the task explicitly changes validation. Keep customer/account fields sourced from route params or store data; avoid hardcoded customer values in new production flows.

## SMS And Print

`TransactionSuccess` handles SMS through `expo-sms`. Receipt printing should use `ReceiptPrinter`, not direct native module calls. If no printer is connected, route to `/printer` and return after successful connection when appropriate.

## Verification

Verify valid/invalid amount entry, scheme selection, success state, dashboard update, SMS availability handling, and print flow with both connected and disconnected printer states.
