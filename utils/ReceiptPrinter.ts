import BluetoothPrinterService from "../services/BluetoothPrinterService";
import {
  amountToWords,
  BankReceiptData,
  formatBankReceipt,
} from "./receiptFormatter";

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
  bankName?: string | null;
  receiptTitle?: string | null;
  time?: string | null;
  customerName?: string | null;
  accountNo?: string | number | null;
  accountOpeningDate?: string | Date | null;
  openingBalance?: number | string | null;
  receivedAmount?: number | string | null;
  totalBalance?: number | string | null;
  amountInWords?: string | null;
  collectorName?: string | null;
  collectorPhone?: string | number | null;
}

export class ReceiptPrinter {
  /**
   * Print a complete receipt
   */
  static async printReceipt(data: ReceiptData): Promise<boolean> {
    try {
      const receiptText = formatReceiptData(data);
      await BluetoothPrinterService.printText(receiptText);
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
      const receiptText = [
        title,
        "",
        "--------------------------------",
        ...items,
        "--------------------------------",
        `TOTAL: ${total}`,
        "",
        "",
        "",
      ].join("\n");

      await BluetoothPrinterService.printText(receiptText);

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
      const receiptText = [
        "TEST PRINT",
        "",
        "--------------------------------",
        "Printer is working correctly!",
        `Date: ${new Date().toLocaleString()}`,
        "--------------------------------",
        "",
        "",
        "",
      ].join("\n");

      await BluetoothPrinterService.printText(receiptText);

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

export function formatReceiptData(data: ReceiptData): string {
  return formatBankReceipt(toBankReceiptData(data));
}

export function toBankReceiptData(data: ReceiptData): BankReceiptData {
  const firstItem = data.items[0];

  return {
    bankName: data.bankName ?? data.storeName,
    receiptTitle: data.receiptTitle ?? "Receipt",
    date: data.date,
    time: data.time,
    customerName: data.customerName ?? data.footer?.replace(/^Customer:\s*/i, ""),
    accountNo: data.accountNo,
    accountOpeningDate: data.accountOpeningDate,
    openingBalance: data.openingBalance,
    receivedAmount: data.receivedAmount ?? firstItem?.total ?? data.total,
    totalBalance: data.totalBalance ?? data.total,
    amountInWords:
      data.amountInWords ??
      amountToWords(data.receivedAmount ?? firstItem?.total ?? data.total),
    collectorName: data.collectorName,
    collectorPhone: data.collectorPhone ?? data.phone,
  };
}
