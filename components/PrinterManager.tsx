import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePrinter } from "../contexts/PrinterContext";
import { ReceiptData, ReceiptPrinter } from "../utils/ReceiptPrinter";

export default function PrinterManager() {
  const {
    isConnected,
    connectedDevice,
    availableDevices,
    isScanning,
    scanForDevices,
    connectToPrinter,
    disconnectPrinter,
    requestPermissions,
  } = usePrinter();

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const handleScan = async () => {
    await scanForDevices();
  };

  const handleConnect = async (address: string) => {
    const success = await connectToPrinter(address);
    if (success) {
      Alert.alert("Success", "Connected to printer successfully!");
    } else {
      Alert.alert("Error", "Failed to connect to printer");
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    Alert.alert("Disconnected", "Printer disconnected successfully");
  };

  const handleTestPrint = async () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to a printer first");
      return;
    }

    setIsPrinting(true);
    const success = await ReceiptPrinter.printTest();
    setIsPrinting(false);

    if (success) {
      Alert.alert("Success", "Test print completed!");
    } else {
      Alert.alert("Error", "Failed to print test receipt");
    }
  };

  const handlePrintSampleReceipt = async () => {
    if (!isConnected) {
      Alert.alert("Not Connected", "Please connect to a printer first");
      return;
    }

    setIsPrinting(true);

    const sampleReceipt: ReceiptData = {
      storeName: "Pigmy Collector Store",
      storeAddress: "123 Main Street, City",
      phone: "+1 234-567-8900",
      receiptNumber: `RC${Date.now()}`,
      date: new Date().toLocaleString(),
      items: [
        {
          name: "Product A",
          quantity: 2,
          price: 25.0,
          total: 50.0,
        },
        {
          name: "Product B",
          quantity: 1,
          price: 15.5,
          total: 15.5,
        },
        {
          name: "Product C",
          quantity: 3,
          price: 10.0,
          total: 30.0,
        },
      ],
      subtotal: 95.5,
      tax: 9.55,
      discount: 5.0,
      total: 100.05,
      paymentMethod: "Cash",
      footer: "Visit us again!",
    };

    const success = await ReceiptPrinter.printReceipt(sampleReceipt);
    setIsPrinting(false);

    if (success) {
      Alert.alert("Success", "Receipt printed successfully!");
    } else {
      Alert.alert("Error", "Failed to print receipt");
    }
  };

  const renderDeviceItem = ({
    item,
  }: {
    item: { name: string; address: string };
  }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleConnect(item.address)}
    >
      <View>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      <Text style={styles.connectText}>Connect</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View
            style={[
              styles.statusBadge,
              isConnected && styles.statusBadgeConnected,
            ]}
          >
            <Text style={styles.statusText}>
              {isConnected ? "Connected" : "Disconnected"}
            </Text>
          </View>
        </View>

        {connectedDevice && (
          <View style={styles.connectedDevice}>
            <Text style={styles.connectedLabel}>Connected to:</Text>
            <Text style={styles.connectedName}>{connectedDevice.name}</Text>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Scan Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Devices</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>Scan for Devices</Text>
          )}
        </TouchableOpacity>

        {availableDevices.length > 0 ? (
          <FlatList
            data={availableDevices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.address}
            style={styles.deviceList}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyText}>
            No devices found. Make sure your printer is paired in Bluetooth
            settings.
          </Text>
        )}
      </View>

      {/* Print Actions */}
      {isConnected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Print Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTestPrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Print Test Page</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handlePrintSampleReceipt}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Print Sample Receipt</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>📝 Instructions:</Text>
        <Text style={styles.infoText}>
          1. Pair your Bluetooth printer in your device's Bluetooth settings
          first
        </Text>
        <Text style={styles.infoText}>
          2. Click "Scan for Devices" to find paired printers
        </Text>
        <Text style={styles.infoText}>3. Select your printer to connect</Text>
        <Text style={styles.infoText}>
          4. Once connected, you can print test pages or receipts
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  statusContainer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FF3B30",
  },
  statusBadgeConnected: {
    backgroundColor: "#34C759",
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  connectedDevice: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  connectedLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  connectedName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  disconnectButton: {
    backgroundColor: "#FF3B30",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  disconnectText: {
    color: "#fff",
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    color: "#666",
  },
  connectText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    padding: 20,
  },
  actionButton: {
    backgroundColor: "#5856D6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonPrimary: {
    backgroundColor: "#34C759",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
});
