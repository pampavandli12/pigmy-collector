import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePrinter } from "../contexts/PrinterContext";
import { ReceiptData, ReceiptPrinter } from "../utils/ReceiptPrinter";

interface PrinterManagerProps {
  onConnectSuccess?: () => void;
}

export default function PrinterManager({ onConnectSuccess }: PrinterManagerProps) {
  const {
    isConnected,
    connectedDevice,
    availableDevices,
    isScanning,
    scanForDevices,
    pairPrinter,
    connectToPrinter,
    disconnectPrinter,
    requestPermissions,
  } = usePrinter();

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  const handleScan = async () => {
    await scanForDevices();
  };

  const handleConnect = async (address: string) => {
    const success = await connectToPrinter(address);
    if (success) {
      Alert.alert("Success", "Connected to printer successfully!", [
        {
          text: "OK",
          onPress: () => {
            onConnectSuccess?.();
          },
        },
      ]);
    } else {
      Alert.alert("Error", "Failed to connect to printer");
    }
  };

  const handlePair = async (address: string) => {
    const success = await pairPrinter(address);
    if (success) {
      await handleConnect(address);
    } else {
      Alert.alert("Error", "Failed to pair printer");
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
    item: { name: string; address: string; paired: boolean; connected: boolean };
  }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceDetails}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
        <View style={styles.deviceBadges}>
          <Text style={[styles.deviceBadge, item.paired && styles.deviceBadgePaired]}>
            {item.paired ? "Paired" : "New"}
          </Text>
          {item.connected && (
            <Text style={[styles.deviceBadge, styles.deviceBadgeConnected]}>
              Connected
            </Text>
          )}
        </View>
      </View>
      {item.paired ? (
        <TouchableOpacity
          style={styles.deviceAction}
          onPress={() => handleConnect(item.address)}
          disabled={item.connected}
        >
          <Text style={styles.connectText}>
            {item.connected ? "Connected" : "Connect"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.deviceAction}
          onPress={() => handlePair(item.address)}
        >
          <Text style={styles.connectText}>Pair</Text>
        </TouchableOpacity>
      )}
    </View>
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
          <View>
            {availableDevices.map((device) => (
              <React.Fragment key={device.address}>
                {renderDeviceItem({ item: device })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No printers found. Turn on the printer and scan again.
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
        <Text style={styles.infoTitle}>Printer setup</Text>
        <Text style={styles.infoText}>Scan, pair new printers, then connect.</Text>
        <Text style={styles.infoText}>Connected printers can print test pages and receipts.</Text>
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
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  deviceDetails: {
    flex: 1,
    paddingRight: 12,
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
  deviceBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  deviceBadge: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deviceBadgePaired: {
    backgroundColor: "#E8F5E9",
    color: "#1B7F3A",
  },
  deviceBadgeConnected: {
    backgroundColor: "#E7F0FF",
    color: "#0066CC",
  },
  deviceAction: {
    minWidth: 78,
    alignItems: "flex-end",
    paddingVertical: 8,
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
