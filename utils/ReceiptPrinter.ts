import BluetoothPrinterService from "../services/BluetoothPrinterService";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  storeName?: string;
  storeAddress?: string;
  phone?: string;
  receiptNumber: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  footer?: string;
}

export class ReceiptPrinter {
  /**
   * Print a complete receipt
   */
  static async printReceipt(data: ReceiptData): Promise<boolean> {
    try {
      await BluetoothPrinterService.printReceipt(data);
      return true;
    } catch (error) {
      console.error("Print receipt error:", error);
      return false;
    }
  }

  /**
   * Print a simple text receipt
   */
  static async printSimpleReceipt(
    title: string,
    items: string[],
    total: string
  ): Promise<boolean> {
    try {
      await BluetoothPrinterService.initialize();

      await BluetoothPrinterService.setAlignment("center");
      await BluetoothPrinterService.printText(title, { fontSize: 1 });
      await BluetoothPrinterService.printLine("");
      await BluetoothPrinterService.printDivider();

      await BluetoothPrinterService.setAlignment("left");
      for (const item of items) {
        await BluetoothPrinterService.printLine(item);
      }

      await BluetoothPrinterService.printDivider();
      await BluetoothPrinterService.setAlignment("right");
      await BluetoothPrinterService.printText(`TOTAL: ${total}`, {
        fontSize: 1,
      });

      await BluetoothPrinterService.feedPaper(3);
      await BluetoothPrinterService.cutPaper();

      return true;
    } catch (error) {
      console.error("Print simple receipt error:", error);
      return false;
    }
  }

  /**
   * Test printer connection
   */
  static async printTest(): Promise<boolean> {
    try {
      await BluetoothPrinterService.initialize();

      await BluetoothPrinterService.setAlignment("center");
      await BluetoothPrinterService.printText("TEST PRINT", { fontSize: 1 });
      await BluetoothPrinterService.printLine("");
      await BluetoothPrinterService.printDivider();

      await BluetoothPrinterService.setAlignment("left");
      await BluetoothPrinterService.printLine("Printer is working correctly!");
      await BluetoothPrinterService.printLine(
        `Date: ${new Date().toLocaleString()}`
      );

      await BluetoothPrinterService.printDivider();
      await BluetoothPrinterService.feedPaper(3);

      return true;
    } catch (error) {
      console.error("Print test error:", error);
      return false;
    }
  }

  /**
   * Print receipt with QR code
   */
  static async printReceiptWithQR(
    data: ReceiptData,
    qrContent: string
  ): Promise<boolean> {
    try {
      const success = await this.printReceipt(data);

      if (success) {
        await BluetoothPrinterService.setAlignment("center");
        await BluetoothPrinterService.printLine("Scan for details:");
        await BluetoothPrinterService.printQRCode(qrContent, 5, 0);
        await BluetoothPrinterService.feedPaper(3);
        await BluetoothPrinterService.cutPaper();
      }

      return success;
    } catch (error) {
      console.error("Print receipt with QR error:", error);
      return false;
    }
  }
}
