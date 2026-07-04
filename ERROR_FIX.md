# Bluetooth Printer Migration Note

The previous startup crash around `DIRECTION` came from the removed third-party Bluetooth printer package.

The app now uses the local Expo module at `modules/expo-thermal-printer`, and `services/BluetoothPrinterService.ts` delegates to that module instead of importing Android Bluetooth APIs or third-party native modules directly.

## Current Checks

- Use a development build; Expo Go is not supported for native Bluetooth.
- Keep Bluetooth permissions in `app.json` and the module Android manifest.
- Rebuild Android after native module changes with `npm run android`.
- Test scan, pair, connect, print text, print QR, print image, and receipt printing on a physical Android device.
