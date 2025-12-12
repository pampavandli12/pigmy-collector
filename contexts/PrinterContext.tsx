import React, { createContext, useCallback, useContext, useState } from "react";
import BluetoothPrinterService, {
  PrinterDevice,
} from "../services/BluetoothPrinterService";

interface PrinterContextType {
  isConnected: boolean;
  connectedDevice: PrinterDevice | null;
  availableDevices: PrinterDevice[];
  isScanning: boolean;
  scanForDevices: () => Promise<void>;
  connectToPrinter: (address: string) => Promise<boolean>;
  disconnectPrinter: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error("usePrinter must be used within PrinterProvider");
  }
  return context;
};

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<PrinterDevice | null>(
    null
  );
  const [availableDevices, setAvailableDevices] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted =
        await BluetoothPrinterService.requestBluetoothPermissions();
      if (granted) {
        const enabled = await BluetoothPrinterService.isBluetoothEnabled();
        if (!enabled) {
          await BluetoothPrinterService.enableBluetooth();
        }
      }
      return granted;
    } catch (error) {
      console.error("Permission error:", error);
      return false;
    }
  }, []);

  const scanForDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log("Bluetooth permissions not granted");
        setIsScanning(false);
        return;
      }

      const devices = await BluetoothPrinterService.scanPairedDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error("Scan error:", error);
      setAvailableDevices([]);
    } finally {
      setIsScanning(false);
    }
  }, [requestPermissions]);

  const connectToPrinter = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        const success = await BluetoothPrinterService.connect(address);
        if (success) {
          const device = availableDevices.find((d) => d.address === address);
          setIsConnected(true);
          setConnectedDevice(device || { name: "Unknown", address });
        }
        return success;
      } catch (error) {
        console.error("Connection error:", error);
        return false;
      }
    },
    [availableDevices]
  );

  const disconnectPrinter = useCallback(async () => {
    try {
      await BluetoothPrinterService.disconnect();
      setIsConnected(false);
      setConnectedDevice(null);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, []);

  const value: PrinterContextType = {
    isConnected,
    connectedDevice,
    availableDevices,
    isScanning,
    scanForDevices,
    connectToPrinter,
    disconnectPrinter,
    requestPermissions,
  };

  return (
    <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
  );
};
