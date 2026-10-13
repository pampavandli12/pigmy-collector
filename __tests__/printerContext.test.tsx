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

test('persists and clears the default printer preference', async () => {
  const { result } = renderHook(() => usePrinter(), { wrapper });
  const device = { name: 'MPT-II', address: 'AA:BB', paired: true, connected: false };

  expect(result.current.getDefaultPrinter()).toBeNull();

  result.current.setDefaultPrinter(device);
  expect(result.current.getDefaultPrinter()).toEqual(device);

  result.current.setDefaultPrinter(null);
  expect(result.current.getDefaultPrinter()).toBeNull();
});

test('silently auto-connects to the default printer without the error snackbar', async () => {
  const { result } = renderHook(() => usePrinter(), { wrapper });
  const device = { name: 'MPT-II', address: 'AA:BB', paired: true, connected: false };
  result.current.setDefaultPrinter(device);

  (printer.connect as jest.Mock).mockRejectedValueOnce(new Error('out of range'));
  await expect(result.current.connectToDefaultPrinter()).resolves.toBe(false);
  expect(showSnackbar).not.toHaveBeenCalled();

  (printer.connect as jest.Mock).mockResolvedValueOnce(true);
  await expect(result.current.connectToDefaultPrinter()).resolves.toBe(true);
  await waitFor(() => expect(result.current.isConnected).toBe(true));
});

test('skips auto-connect when no default printer is set', async () => {
  const { result } = renderHook(() => usePrinter(), { wrapper });
  result.current.setDefaultPrinter(null);

  await expect(result.current.connectToDefaultPrinter()).resolves.toBe(false);
  expect(printer.connect).not.toHaveBeenCalled();
});
