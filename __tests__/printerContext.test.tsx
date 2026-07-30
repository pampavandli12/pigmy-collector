jest.mock('../modules/expo-thermal-printer/src/ExpoThermalPrinterModule', () => ({
  __esModule: true,
  default: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('../services/BluetoothPrinterService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn().mockResolvedValue(false),
    requestBluetoothPermissions: jest.fn(), isBluetoothEnabled: jest.fn(),
    enableBluetooth: jest.fn(), scanPairedDevices: jest.fn(), startScan: jest.fn(),
    pairPrinter: jest.fn(), connect: jest.fn(), disconnect: jest.fn(),
  },
}));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { PrinterProvider, usePrinter } from '../contexts/PrinterContext';
import printer from '../services/BluetoothPrinterService';
import { showSnackbar } from '../utils/snackbar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PrinterProvider>{children}</PrinterProvider>
);

beforeEach(() => jest.clearAllMocks());

test('exposes disconnected initial printer state', async () => {
  const { result } = renderHook(() => usePrinter(), { wrapper });
  await waitFor(() => expect(result.current.isConnected).toBe(false));
});

test('shows permission failures through the snackbar', async () => {
  (printer.requestBluetoothPermissions as jest.Mock).mockRejectedValue(new Error('denied'));
  const { result } = renderHook(() => usePrinter(), { wrapper });
  await expect(result.current.requestPermissions()).resolves.toBe(false);
  expect(showSnackbar).toHaveBeenCalledWith('Unable to request Bluetooth permission.', { type: 'error' });
});
