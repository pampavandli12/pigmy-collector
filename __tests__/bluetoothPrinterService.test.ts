jest.mock('../modules/expo-thermal-printer/src/ExpoThermalPrinterModule', () => ({
  __esModule: true,
  default: {
    requestPermissions: jest.fn(), enableBluetooth: jest.fn(), isBluetoothEnabled: jest.fn(),
    getPairedPrinters: jest.fn(), startScan: jest.fn(), stopScan: jest.fn(), pairPrinter: jest.fn(),
    connect: jest.fn(), disconnect: jest.fn(), isConnected: jest.fn(), printText: jest.fn(),
    printImage: jest.fn(), printQr: jest.fn(), printReceipt: jest.fn(),
  },
}));

import nativePrinter from '../modules/expo-thermal-printer/src/ExpoThermalPrinterModule';
import printer from '../services/BluetoothPrinterService';

beforeEach(() => jest.clearAllMocks());

test('tracks a successfully connected printer', async () => {
  (nativePrinter.connect as jest.Mock).mockResolvedValue(true);
  await expect(printer.connect('AA:BB')).resolves.toBe(true);
  expect(printer.getConnectedDevice()).toMatchObject({ address: 'AA:BB', connected: true });
});

test('formats aligned columns before printing', async () => {
  await printer.printColumns(['A', '2'], [3, 3], [0, 2]);
  expect(nativePrinter.printText).toHaveBeenCalledWith('A    2\n');
});

test('clears the connected device after disconnecting', async () => {
  await printer.disconnect();
  expect(printer.getConnectedDevice()).toBeNull();
});
