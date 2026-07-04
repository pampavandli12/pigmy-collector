import { NativeModule, requireNativeModule } from 'expo';
import {
  ExpoThermalPrinterModuleEvents,
  PrinterDevice,
  Receipt,
  ReceiptItem,
} from './ExpoThermalPrinter.types';

declare class ExpoThermalPrinterModule extends NativeModule<ExpoThermalPrinterModuleEvents> {
  requestPermissions(): Promise<boolean>;
  isBluetoothEnabled(): Promise<boolean>;
  enableBluetooth(): Promise<boolean>;
  getPairedPrinters(): Promise<PrinterDevice[]>;
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  pairPrinter(address: string): Promise<boolean>;
  connect(address: string): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  printText(text: string): Promise<void>;
  printImage(base64: string): Promise<void>;
  printQr(data: string): Promise<void>;
  printReceipt(data: Receipt): Promise<void>;
}

export default requireNativeModule<ExpoThermalPrinterModule>(
  'ExpoThermalPrinter',
);

export type { PrinterDevice, Receipt, ReceiptItem };
