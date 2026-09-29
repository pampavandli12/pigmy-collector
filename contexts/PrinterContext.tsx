import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ExpoThermalPrinter from "../modules/expo-thermal-printer/src/ExpoThermalPrinterModule";
import BluetoothPrinterService, {
  PrinterDevice,
} from "../services/BluetoothPrinterService";
import { showSnackbar } from "../utils/snackbar";

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

  // Safety net: startScan() resolves immediately and relies on a native
  // "scanFinished" event to clear the spinner. If that event never fires (BT
  // turned off mid-scan, adapter error), this timeout ends the scan so the UI
  // isn't stuck disabled forever.
  const SCAN_TIMEOUT_MS = 20000;
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearScanTimeout = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

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
      clearScanTimeout();
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
      clearScanTimeout();
      deviceFound.remove();
      scanStarted.remove();
      scanFinished.remove();
      paired.remove();
      connected.remove();
      disconnected.remove();
      connectionLost.remove();
    };
  }, [upsertDevice, clearScanTimeout]);

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
    } catch {
      showSnackbar("Unable to request Bluetooth permission.", { type: "error" });
      return false;
    }
  }, []);

  const scanForDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        showSnackbar("Bluetooth permission is required to find printers.", {
          type: "error",
        });
        clearScanTimeout();
        setIsScanning(false);
        return;
      }

      const pairedDevices = await BluetoothPrinterService.scanPairedDevices();
      setAvailableDevices(pairedDevices);
      await BluetoothPrinterService.startScan();

      clearScanTimeout();
      scanTimeoutRef.current = setTimeout(() => {
        scanTimeoutRef.current = null;
        setIsScanning(false);
      }, SCAN_TIMEOUT_MS);
    } catch {
      showSnackbar("Unable to scan for printers.", { type: "error" });
      clearScanTimeout();
      setIsScanning(false);
    }
  }, [requestPermissions, clearScanTimeout]);

  const pairPrinter = useCallback(async (address: string): Promise<boolean> => {
    try {
      return await BluetoothPrinterService.pairPrinter(address);
    } catch {
      showSnackbar("Unable to pair with the printer.", { type: "error" });
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
      } catch {
        showSnackbar("Unable to connect to the printer.", { type: "error" });
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
    } catch {
      showSnackbar("Unable to disconnect the printer.", { type: "error" });
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
