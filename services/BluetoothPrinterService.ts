import { PermissionsAndroid, Platform } from "react-native";

// Safely import Bluetooth modules with error handling
let BluetoothEscposPrinter: any = null;
let BluetoothManager: any = null;

try {
  const BluetoothModule = require("react-native-bluetooth-escpos-printer");
  BluetoothEscposPrinter = BluetoothModule.BluetoothEscposPrinter;
  BluetoothManager = BluetoothModule.BluetoothManager;
} catch (error) {
  console.warn("Bluetooth printer module not available:", error);
}

export interface PrinterDevice {
  name: string;
  address: string;
}

class BluetoothPrinterService {
  private isConnected: boolean = false;
  private connectedDevice: PrinterDevice | null = null;

  /**
   * Check if Bluetooth module is available
   */
  private isModuleAvailable(): boolean {
    if (!BluetoothManager || !BluetoothEscposPrinter) {
      console.error("Bluetooth printer module not loaded");
      return false;
    }
    return true;
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        // Android 12+ requires new permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted["android.permission.BLUETOOTH_SCAN"] === "granted" &&
          granted["android.permission.BLUETOOTH_CONNECT"] === "granted" &&
          granted["android.permission.ACCESS_FINE_LOCATION"] === "granted"
        );
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted["android.permission.BLUETOOTH"] === "granted" &&
          granted["android.permission.BLUETOOTH_ADMIN"] === "granted" &&
          granted["android.permission.ACCESS_FINE_LOCATION"] === "granted"
        );
      }
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  }

  /**
   * Enable Bluetooth
   */
  async enableBluetooth(): Promise<boolean> {
    if (!this.isModuleAvailable()) return false;

    try {
      await BluetoothManager.enableBluetooth();
      return true;
    } catch (error) {
      console.error("Error enabling Bluetooth:", error);
      return false;
    }
  }

  /**
   * Check if Bluetooth is enabled
   */
  async isBluetoothEnabled(): Promise<boolean> {
    if (!this.isModuleAvailable()) return false;

    try {
      const enabled = await BluetoothManager.isBluetoothEnabled();
      return enabled;
    } catch (error) {
      console.error("Error checking Bluetooth status:", error);
      return false;
    }
  }

  /**
   * Scan for paired Bluetooth devices
   */
  async scanPairedDevices(): Promise<PrinterDevice[]> {
    if (!this.isModuleAvailable()) return [];

    try {
      // Enable Bluetooth and get paired devices in one call
      const devicesString = await BluetoothManager.enableBluetooth();

      // Parse the JSON string returned by enableBluetooth
      let pairedDevicesArray: any[] = [];

      if (devicesString && typeof devicesString === "string") {
        // Remove any trailing commas and fix JSON format
        const cleanedString = devicesString
          .replace(/,\s*]/g, "]")
          .replace(/,\s*}/g, "}");
        try {
          pairedDevicesArray = JSON.parse(cleanedString);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.log("Received string:", devicesString);
          // Try alternative: it might already be an array
          if (Array.isArray(devicesString)) {
            pairedDevicesArray = devicesString;
          }
        }
      } else if (Array.isArray(devicesString)) {
        pairedDevicesArray = devicesString;
      }

      // Log the raw devices to see their structure
      console.log(
        "Paired devices raw data:",
        JSON.stringify(pairedDevicesArray, null, 2)
      );

      return pairedDevicesArray.map((device: any) => {
        let deviceObj = device;

        // If device is a string, parse it as JSON
        if (typeof device === "string") {
          try {
            deviceObj = JSON.parse(device);
          } catch (e) {
            console.error("Failed to parse device string:", device);
            return { name: "Unknown Device", address: "" };
          }
        }

        return {
          name: deviceObj.name || deviceObj.address || "Unknown Device",
          address: deviceObj.address || "",
        };
      });
    } catch (error) {
      console.error("Error scanning devices:", error);
      return [];
    }
  }

  /**
   * Connect to a Bluetooth printer
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isModuleAvailable()) return false;

    try {
      await BluetoothManager.connect(address);
      this.isConnected = true;
      this.connectedDevice = { name: "", address };
      return true;
    } catch (error) {
      console.error("Connection error:", error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    if (!this.isModuleAvailable()) return;

    try {
      await BluetoothManager.disconnect();
      this.isConnected = false;
      this.connectedDevice = null;
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get connected device
   */
  getConnectedDevice(): PrinterDevice | null {
    return this.connectedDevice;
  }

  /**
   * Print text
   */
  async printText(
    text: string,
    options?: {
      fontType?: number;
      fontSize?: number;
      align?: number;
    }
  ): Promise<boolean> {
    if (!this.isModuleAvailable()) return false;

    try {
      const { fontType = 0, fontSize = 0, align = 0 } = options || {};

      await BluetoothEscposPrinter.printText(text, {
        fonttype: fontType,
        widthtimes: fontSize,
        heigthtimes: fontSize,
        encoding: "UTF-8",
      });

      return true;
    } catch (error) {
      console.error("Print error:", error);
      return false;
    }
  }

  /**
   * Print line with text
   */
  async printLine(text: string): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printText(`${text}\n`, {});
  }

  /**
   * Print multiple columns
   */
  async printColumns(
    columns: string[],
    widths: number[],
    align: number[]
  ): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printColumn(widths, align, columns, {});
  }

  /**
   * Print image from base64
   */
  async printImage(base64: string, width: number = 300): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printPic(base64, { width });
  }

  /**
   * Print QR code
   */
  async printQRCode(
    content: string,
    size: number = 5,
    errorCorrectionLevel: number = 0
  ): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printQRCode(
      content,
      size,
      errorCorrectionLevel
    );
  }

  /**
   * Print barcode
   */
  async printBarcode(
    content: string,
    type: number = 73,
    width: number = 2,
    height: number = 50,
    textPosition: number = 2
  ): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printBarCode(
      content,
      type,
      width,
      height,
      textPosition,
      2
    );
  }

  /**
   * Set print alignment
   */
  async setAlignment(align: "left" | "center" | "right"): Promise<void> {
    if (!this.isModuleAvailable()) return;

    const alignMap = { left: 0, center: 1, right: 2 };
    await BluetoothEscposPrinter.printerAlign(alignMap[align]);
  }

  /**
   * Print divider line
   */
  async printDivider(): Promise<void> {
    await this.printLine("--------------------------------");
  }

  /**
   * Feed paper
   */
  async feedPaper(lines: number = 3): Promise<void> {
    for (let i = 0; i < lines; i++) {
      await this.printLine("");
    }
  }

  /**
   * Cut paper (if supported)
   */
  async cutPaper(): Promise<void> {
    if (!this.isModuleAvailable()) return;

    try {
      await BluetoothEscposPrinter.cutOnePoint();
    } catch (error) {
      console.log("Paper cut not supported");
    }
  }

  /**
   * Initialize printer
   */
  async initialize(): Promise<void> {
    if (!this.isModuleAvailable()) return;

    await BluetoothEscposPrinter.printerInit();
  }
}

export default new BluetoothPrinterService();
