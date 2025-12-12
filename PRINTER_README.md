# Bluetooth Printer Integration

This project now includes Bluetooth receipt printing functionality.

## Features

- ✅ Bluetooth device scanning and pairing
- ✅ ESC/POS thermal printer support
- ✅ Receipt template system
- ✅ QR code and barcode printing
- ✅ Test print functionality
- ✅ Connection management

## Setup

### 1. Install Dependencies

The required dependencies are already installed:

```bash
npm install react-native-bluetooth-escpos-printer
```

### 2. Build with Expo Development Build

Since this uses native modules, you need to create a development build:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

**Note:** This will NOT work with Expo Go. You must use a development build.

### 3. Permissions

Bluetooth permissions are configured in `app.json` for Android. Make sure your printer is paired in your device's Bluetooth settings before using the app.

## Usage

### Basic Printer Setup

1. Navigate to the Printer screen
2. Click "Scan for Devices"
3. Select your paired Bluetooth printer
4. Test the connection with "Print Test Page"

### Printing a Receipt

```typescript
import { ReceiptPrinter, ReceiptData } from "./utils/ReceiptPrinter";

const receiptData: ReceiptData = {
  storeName: "My Store",
  storeAddress: "123 Main Street",
  phone: "+1 234-567-8900",
  receiptNumber: "RC001",
  date: new Date().toLocaleString(),
  items: [
    {
      name: "Product A",
      quantity: 2,
      price: 25.0,
      total: 50.0,
    },
  ],
  subtotal: 50.0,
  tax: 5.0,
  total: 55.0,
  paymentMethod: "Cash",
};

await ReceiptPrinter.printReceipt(receiptData);
```

### Using the Printer Context

```typescript
import { usePrinter } from "./contexts/PrinterContext";

function MyComponent() {
  const { isConnected, connectedDevice, scanForDevices, connectToPrinter } =
    usePrinter();

  // Your component logic
}
```

## File Structure

```
├── app/
│   ├── _layout.tsx          # App layout with PrinterProvider
│   ├── index.tsx            # Home screen with printer status
│   └── printer.tsx          # Printer management screen
├── contexts/
│   └── PrinterContext.tsx   # Printer state management
├── services/
│   └── BluetoothPrinterService.ts  # Bluetooth printer service
└── utils/
    └── ReceiptPrinter.ts    # Receipt formatting and printing
```

## API Reference

### BluetoothPrinterService

- `requestBluetoothPermissions()` - Request Bluetooth permissions
- `scanPairedDevices()` - Get list of paired devices
- `connect(address)` - Connect to a printer
- `disconnect()` - Disconnect from printer
- `printText(text, options)` - Print text
- `printColumns(cols, widths, align)` - Print in columns
- `printQRCode(content, size)` - Print QR code
- `printBarcode(content, type)` - Print barcode

### ReceiptPrinter

- `printReceipt(data)` - Print formatted receipt
- `printSimpleReceipt(title, items, total)` - Print simple receipt
- `printTest()` - Print test page
- `printReceiptWithQR(data, qrContent)` - Print receipt with QR code

## Supported Printers

This works with ESC/POS compatible thermal printers, including:

- Most 58mm and 80mm thermal receipt printers
- Mobile Bluetooth printers (e.g., Zjiang, Goojprt, etc.)

## Troubleshooting

### App crashes or printer not found

- Make sure you're using a development build, not Expo Go
- Pair your printer in device Bluetooth settings first
- Grant all required Bluetooth permissions

### Print quality issues

- Adjust font size in receipt templates
- Check printer paper alignment
- Ensure printer has sufficient battery/power

### Connection fails

- Verify printer is powered on and in range
- Try unpairing and re-pairing the printer
- Check if printer is already connected to another device

## Next Steps

- Customize receipt templates in `utils/ReceiptPrinter.ts`
- Add custom branding (logos via base64 images)
- Implement receipt history
- Add cloud receipt storage
- Create custom print templates for different transaction types
