import ExpoThermalPrinter, {
  PrinterDevice,
  Receipt,
} from "../modules/expo-thermal-printer/src/ExpoThermalPrinterModule";

export type { PrinterDevice };

type PrintTextOptions = {
  fontType?: number;
  fontSize?: number;
  align?: number;
};

class BluetoothPrinterService {
  private connectedDevice: PrinterDevice | null = null;

  async requestBluetoothPermissions(): Promise<boolean> {
    return ExpoThermalPrinter.requestPermissions();
  }

  async enableBluetooth(): Promise<boolean> {
    return ExpoThermalPrinter.enableBluetooth();
  }

  async isBluetoothEnabled(): Promise<boolean> {
    return ExpoThermalPrinter.isBluetoothEnabled();
  }

  async scanPairedDevices(): Promise<PrinterDevice[]> {
    return ExpoThermalPrinter.getPairedPrinters();
  }

  async startScan(): Promise<void> {
    await ExpoThermalPrinter.startScan();
  }

  async stopScan(): Promise<void> {
    await ExpoThermalPrinter.stopScan();
  }

  async pairPrinter(address: string): Promise<boolean> {
    return ExpoThermalPrinter.pairPrinter(address);
  }

  async connect(address: string): Promise<boolean> {
    const connected = await ExpoThermalPrinter.connect(address);
    if (connected) {
      this.connectedDevice = { name: "Printer", address, paired: true, connected: true };
    }
    return connected;
  }

  async disconnect(): Promise<void> {
    await ExpoThermalPrinter.disconnect();
    this.connectedDevice = null;
  }

  async isConnected(): Promise<boolean> {
    return ExpoThermalPrinter.isConnected();
  }

  getConnectedDevice(): PrinterDevice | null {
    return this.connectedDevice;
  }

  async printText(text: string, _options?: PrintTextOptions): Promise<boolean> {
    await ExpoThermalPrinter.printText(text);
    return true;
  }

  async printLine(text: string): Promise<void> {
    await ExpoThermalPrinter.printText(`${text}\n`);
  }

  async printColumns(
    columns: string[],
    widths: number[],
    align: number[]
  ): Promise<void> {
    const line = columns
      .map((column, index) => {
        const width = widths[index] ?? column.length;
        const alignment = align[index] ?? 0;
        if (alignment === 2) return column.padStart(width).slice(-width);
        if (alignment === 1) {
          const padding = Math.max(width - column.length, 0);
          const left = Math.floor(padding / 2);
          const right = padding - left;
          return `${" ".repeat(left)}${column}${" ".repeat(right)}`.slice(0, width);
        }
        return column.padEnd(width).slice(0, width);
      })
      .join("");
    await this.printLine(line);
  }

  async printImage(base64: string): Promise<void> {
    await ExpoThermalPrinter.printImage(base64);
  }

  async printQRCode(
    content: string,
    _size?: number,
    _errorCorrectionLevel?: number
  ): Promise<void> {
    await ExpoThermalPrinter.printQr(content);
  }

  async printBarcode(content: string): Promise<void> {
    await ExpoThermalPrinter.printText(content);
  }

  async setAlignment(_align: "left" | "center" | "right"): Promise<void> {
    // Native receipt rendering owns ESC/POS alignment. This remains for legacy helpers.
  }

  async printDivider(): Promise<void> {
    await this.printLine("--------------------------------");
  }

  async feedPaper(lines: number = 3): Promise<void> {
    await ExpoThermalPrinter.printText("\n".repeat(lines));
  }

  async cutPaper(): Promise<void> {
    // Cutting is performed by native receipt rendering when supported.
  }

  async initialize(): Promise<void> {
    // Native print methods initialize the printer before writing.
  }

  async printReceipt(data: Receipt): Promise<void> {
    await ExpoThermalPrinter.printReceipt(data);
  }
}

export default new BluetoothPrinterService();
