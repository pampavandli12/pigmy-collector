export interface PrinterDevice {
  name: string;
  address: string;
  paired: boolean;
  connected: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Receipt {
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

export type ScanFinishedPayload = {
  devices?: PrinterDevice[];
};

export type ConnectionLostPayload = {
  address: string;
  message?: string;
};

export type ExpoThermalPrinterModuleEvents = {
  deviceFound: (device: PrinterDevice) => void;
  scanStarted: () => void;
  scanFinished: (payload: ScanFinishedPayload) => void;
  paired: (device: PrinterDevice) => void;
  connected: (device: PrinterDevice) => void;
  disconnected: () => void;
  connectionLost: (payload: ConnectionLostPayload) => void;
};
