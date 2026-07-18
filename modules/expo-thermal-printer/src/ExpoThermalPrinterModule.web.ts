import { registerWebModule, NativeModule } from 'expo';

import {
  ExpoThermalPrinterModuleEvents,
  PrinterDevice,
  Receipt,
} from './ExpoThermalPrinter.types';

class ExpoThermalPrinterModule extends NativeModule<ExpoThermalPrinterModuleEvents> {
  private unsupported(): never {
    throw new Error('ExpoThermalPrinter is only supported on Android');
  }

  async requestPermissions(): Promise<boolean> { return false; }
  async isBluetoothEnabled(): Promise<boolean> { return false; }
  async enableBluetooth(): Promise<boolean> { return false; }
  async getPairedPrinters(): Promise<PrinterDevice[]> { return []; }
  async startScan(): Promise<void> { this.unsupported(); }
  async stopScan(): Promise<void> {}
  async pairPrinter(_address: string): Promise<boolean> { this.unsupported(); }
  async connect(_address: string): Promise<boolean> { this.unsupported(); }
  async disconnect(): Promise<void> {}
  async isConnected(): Promise<boolean> { return false; }
  async printText(_text: string): Promise<void> { this.unsupported(); }
  async printImage(_base64: string): Promise<void> { this.unsupported(); }
  async printQr(_data: string): Promise<void> { this.unsupported(); }
  async printReceipt(_data: Receipt): Promise<void> { this.unsupported(); }
}

export default registerWebModule(ExpoThermalPrinterModule, 'ExpoThermalPrinter');
