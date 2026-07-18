---
name: pigmy-printer-integration
description: Work with Pigmy Collector Bluetooth printer permissions, scan/pair/connect/disconnect, receipt printing, native Expo thermal printer module, PrinterContext, PrinterManager, BluetoothPrinterService, ReceiptPrinter, or modules/expo-thermal-printer.
---

# Pigmy Printer Integration

## Files To Inspect

- `contexts/PrinterContext.tsx`: app-facing printer state, `usePrinter`, native event listeners.
- `components/PrinterManager.tsx`: printer UI actions.
- `services/BluetoothPrinterService.ts`: service adapter over the native module.
- `utils/ReceiptPrinter.ts`: receipt-level helper used by UI.
- `app/printer.tsx`: printer screen and redirect-back behavior.
- `modules/expo-thermal-printer/src/*`: TypeScript module surface.
- `modules/expo-thermal-printer/android/src/main/java/...`: Android Kotlin implementation.

## Working Rules

Keep screens and components behind `usePrinter`, `BluetoothPrinterService`, or `ReceiptPrinter`; avoid direct native module calls outside those layers. Preserve the lifecycle: request permissions, ensure Bluetooth enabled, scan paired/new devices, pair if needed, connect, then print.

Treat Android as the active native implementation. The app requires a development build; Expo Go cannot validate this module.

## Receipt Printing

High-level transaction receipts should use `ReceiptPrinter.printReceipt`. Keep native ESC/POS details inside the service/native module. For connection-dependent UI, handle the disconnected state by routing to `/printer` rather than failing silently.

## Verification

Use a physical Android device when changing printer code. Verify permission prompts, scan results, pair/connect/disconnect state, test print, transaction receipt print, and connection-lost behavior.
