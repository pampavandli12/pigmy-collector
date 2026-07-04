import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import ExpoThermalPrinter from "../modules/expo-thermal-printer/src/ExpoThermalPrinterModule";
import BluetoothPrinterService, {
  PrinterDevice,
} from "../services/BluetoothPrinterService";

interface PrinterContextType {
  isConnected: boolean;
  connectedDevice: PrinterDevice | null;
  availableDevices: PrinterDevice[];
  isScanning: boolean;
  scanForDevices: () => Promise<void>;
  pairPrinter: (address: string) => Promise<boolean>;
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

  const upsertDevice = useCallback((device: PrinterDevice) => {
    setAvailableDevices((current) => {
      const index = current.findIndex((item) => item.address === device.address);
      if (index === -1) return [...current, device];

      const next = [...current];
      next[index] = { ...next[index], ...device };
      return next;
    });
  }, []);

  useEffect(() => {
    const deviceFound = ExpoThermalPrinter.addListener("deviceFound", upsertDevice);
    const scanStarted = ExpoThermalPrinter.addListener("scanStarted", () => {
      setIsScanning(true);
    });
    const scanFinished = ExpoThermalPrinter.addListener("scanFinished", (payload) => {
      if (payload.devices?.length) {
        setAvailableDevices(payload.devices);
      }
      setIsScanning(false);
    });
    const paired = ExpoThermalPrinter.addListener("paired", upsertDevice);
    const connected = ExpoThermalPrinter.addListener("connected", (device) => {
      setIsConnected(true);
      setConnectedDevice(device);
      upsertDevice({ ...device, connected: true });
    });
    const disconnected = ExpoThermalPrinter.addListener("disconnected", () => {
      setIsConnected(false);
      setConnectedDevice(null);
      setAvailableDevices((current) =>
        current.map((device) => ({ ...device, connected: false }))
      );
    });
    const connectionLost = ExpoThermalPrinter.addListener("connectionLost", () => {
      setIsConnected(false);
      setConnectedDevice(null);
      setAvailableDevices((current) =>
        current.map((device) => ({ ...device, connected: false }))
      );
    });

    return () => {
      deviceFound.remove();
      scanStarted.remove();
      scanFinished.remove();
      paired.remove();
      connected.remove();
      disconnected.remove();
      connectionLost.remove();
    };
  }, [upsertDevice]);

  useEffect(() => {
    BluetoothPrinterService.isConnected()
      .then(setIsConnected)
      .catch(() => setIsConnected(false));
  }, []);

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

      const pairedDevices = await BluetoothPrinterService.scanPairedDevices();
      setAvailableDevices(pairedDevices);
      await BluetoothPrinterService.startScan();
    } catch (error) {
      console.error("Scan error:", error);
      setIsScanning(false);
    }
  }, [requestPermissions]);

  const pairPrinter = useCallback(async (address: string): Promise<boolean> => {
    try {
      return await BluetoothPrinterService.pairPrinter(address);
    } catch (error) {
      console.error("Pairing error:", error);
      return false;
    }
  }, []);

  const connectToPrinter = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        const success = await BluetoothPrinterService.connect(address);
        if (success) {
          const device = availableDevices.find((d) => d.address === address);
          setIsConnected(true);
          setConnectedDevice(
            device || { name: "Unknown", address, paired: true, connected: true }
          );
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
    pairPrinter,
    connectToPrinter,
    disconnectPrinter,
    requestPermissions,
  };

  return (
    <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
  );
};
