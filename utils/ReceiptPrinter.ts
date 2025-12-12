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
      await BluetoothPrinterService.initialize();

      // Header
      if (data.storeName) {
        await BluetoothPrinterService.setAlignment("center");
        await BluetoothPrinterService.printText(data.storeName, {
          fontSize: 1,
          fontType: 1,
        });
        await BluetoothPrinterService.printLine("");
      }

      if (data.storeAddress) {
        await BluetoothPrinterService.setAlignment("center");
        await BluetoothPrinterService.printLine(data.storeAddress);
      }

      if (data.phone) {
        await BluetoothPrinterService.setAlignment("center");
        await BluetoothPrinterService.printLine(`Tel: ${data.phone}`);
      }

      await BluetoothPrinterService.printLine("");
      await BluetoothPrinterService.printDivider();

      // Receipt details
      await BluetoothPrinterService.setAlignment("left");
      await BluetoothPrinterService.printColumns(
        ["Receipt #:", data.receiptNumber],
        [16, 16],
        [0, 2]
      );
      await BluetoothPrinterService.printColumns(
        ["Date:", data.date],
        [16, 16],
        [0, 2]
      );
      await BluetoothPrinterService.printDivider();

      // Items header
      await BluetoothPrinterService.printColumns(
        ["Item", "Qty", "Price", "Total"],
        [14, 6, 6, 6],
        [0, 1, 2, 2]
      );
      await BluetoothPrinterService.printDivider();

      // Items
      for (const item of data.items) {
        // Item name
        await BluetoothPrinterService.printLine(item.name);

        // Quantity, price, and total
        await BluetoothPrinterService.printColumns(
          [
            "",
            `${item.quantity}`,
            `$${item.price.toFixed(2)}`,
            `$${item.total.toFixed(2)}`,
          ],
          [14, 6, 6, 6],
          [0, 1, 2, 2]
        );
      }

      await BluetoothPrinterService.printDivider();

      // Totals
      await BluetoothPrinterService.printColumns(
        ["Subtotal:", `$${data.subtotal.toFixed(2)}`],
        [20, 12],
        [0, 2]
      );

      if (data.tax) {
        await BluetoothPrinterService.printColumns(
          ["Tax:", `$${data.tax.toFixed(2)}`],
          [20, 12],
          [0, 2]
        );
      }

      if (data.discount) {
        await BluetoothPrinterService.printColumns(
          ["Discount:", `-$${data.discount.toFixed(2)}`],
          [20, 12],
          [0, 2]
        );
      }

      await BluetoothPrinterService.printDivider();
      await BluetoothPrinterService.printColumns(
        ["TOTAL:", `$${data.total.toFixed(2)}`],
        [20, 12],
        [0, 2]
      );

      if (data.paymentMethod) {
        await BluetoothPrinterService.printLine("");
        await BluetoothPrinterService.printColumns(
          ["Payment:", data.paymentMethod],
          [16, 16],
          [0, 2]
        );
      }

      await BluetoothPrinterService.printDivider();

      // Footer
      if (data.footer) {
        await BluetoothPrinterService.printLine("");
        await BluetoothPrinterService.setAlignment("center");
        await BluetoothPrinterService.printLine(data.footer);
      }

      await BluetoothPrinterService.setAlignment("center");
      await BluetoothPrinterService.printLine("");
      await BluetoothPrinterService.printLine("Thank you!");
      await BluetoothPrinterService.printLine("");

      // Feed and cut
      await BluetoothPrinterService.feedPaper(3);
      await BluetoothPrinterService.cutPaper();

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
