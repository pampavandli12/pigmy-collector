/**
 * The Bluetooth printer setup screen's content: a two-step wizard — pick and
 * pair a device (with an optional "default printer" preference), then verify
 * the connection with a test print. Built on `contexts/PrinterContext.tsx`.
 */
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Icon, IconButton, Switch, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrinter } from "../contexts/PrinterContext";
import { PrinterDevice } from "../services/BluetoothPrinterService";
import { ReceiptPrinter } from "../utils/ReceiptPrinter";
import { showSnackbar } from "../utils/snackbar";

interface PrinterManagerProps {
  onConnectSuccess?: () => void;
  onClose?: () => void;
}

type Step = "select" | "ready";

const PRIMARY = "#007AFF";
const SUCCESS = "#0D9F59";
const DANGER = "#D32F2F";

export default function PrinterManager({ onConnectSuccess, onClose }: PrinterManagerProps) {
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
    getDefaultPrinter,
    setDefaultPrinter,
  } = usePrinter();

  const [step, setStep] = useState<Step>(() => (isConnected ? "ready" : "select"));
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    () => connectedDevice?.address ?? null
  );
  const [autoDefault, setAutoDefault] = useState(true);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  useEffect(() => {
    setDefaultAddress(getDefaultPrinter()?.address ?? null);
  }, [getDefaultPrinter]);

  useEffect(() => {
    if (step === "select") {
      scanForDevices();
    }
  }, [step, scanForDevices]);

  useEffect(() => {
    if (!selectedAddress && availableDevices.length > 0) {
      setSelectedAddress(availableDevices[0].address);
    }
  }, [availableDevices, selectedAddress]);

  const selectedDevice: PrinterDevice | null =
    availableDevices.find((device) => device.address === selectedAddress) ?? null;

  const handlePairAndConnect = async () => {
    if (!selectedDevice || isConnecting) return;

    setIsConnecting(true);
    try {
      if (!selectedDevice.paired) {
        const paired = await pairPrinter(selectedDevice.address);
        if (!paired) {
          Alert.alert("Error", "Failed to pair printer");
          return;
        }
      }

      const connected = await connectToPrinter(selectedDevice.address, {
        fallbackDevice: selectedDevice,
      });
      if (!connected) {
        Alert.alert("Error", "Failed to connect to printer");
        return;
      }

      if (autoDefault) {
        setDefaultPrinter(selectedDevice);
        setDefaultAddress(selectedDevice.address);
      }
      setStep("ready");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    const success = await ReceiptPrinter.printTest();
    setIsPrinting(false);

    if (success) {
      Alert.alert("Success", "Test print completed!");
    } else {
      Alert.alert("Error", "Failed to print test receipt");
    }
  };

  const handleForget = () => {
    Alert.alert(
      "Forget printer?",
      "This disconnects the printer and clears it as your default receipt printer.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forget",
          style: "destructive",
          onPress: async () => {
            await disconnectPrinter();
            setDefaultPrinter(null);
            setDefaultAddress(null);
            setSelectedAddress(null);
            setStep("select");
            showSnackbar("Printer disconnected.", { type: "success" });
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (step === "ready") {
      setStep("select");
      return;
    }
    onClose?.();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={22} onPress={handleBack} style={styles.headerButton} />
        <View style={styles.headerTitleWrap}>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Printer Setup
          </Text>
          {step === "ready" && (
            <Text variant="labelSmall" style={styles.headerSubtitle}>
              STEP 2: READY & TEST
            </Text>
          )}
        </View>
        <IconButton icon="close" size={22} onPress={onClose} style={styles.headerButton} />
      </View>

      {step === "select" ? (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.scanBanner}>
              <View style={styles.scanBannerLeft}>
                <View style={styles.scanIconWrap}>
                  <Icon source="bluetooth" size={18} color={PRIMARY} />
                </View>
                <View>
                  <Text variant="labelLarge">
                    {isScanning ? "Searching for printers…" : "Available printers"}
                  </Text>
                  <Text variant="bodySmall" style={styles.hintText}>
                    Keep device within 2m
                  </Text>
                </View>
              </View>
              <Button
                mode="outlined"
                compact
                icon="refresh"
                loading={isScanning}
                onPress={scanForDevices}
              >
                Rescan
              </Button>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text variant="titleSmall" style={styles.sectionHeaderText}>
                Available Devices
              </Text>
              <View style={styles.countChip}>
                <Text variant="labelSmall" style={styles.countChipText}>
                  {availableDevices.length} found
                </Text>
              </View>
            </View>

            {availableDevices.length > 0 ? (
              <View style={styles.deviceList}>
                {availableDevices.map((device) => {
                  const isSelected = device.address === selectedAddress;
                  const badgeLabel = device.connected
                    ? "Connected"
                    : device.paired
                      ? "Paired"
                      : "Available";
                  return (
                    <DeviceRow
                      key={device.address}
                      device={device}
                      isSelected={isSelected}
                      badgeLabel={badgeLabel}
                      onPress={() => setSelectedAddress(device.address)}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {isScanning
                  ? "Scanning for nearby printers…"
                  : "No printers found. Turn on the printer and scan again."}
              </Text>
            )}

            <View style={styles.defaultRow}>
              <View style={styles.defaultRowLeft}>
                <Icon source="star" size={18} color={PRIMARY} />
                <View style={styles.defaultRowText}>
                  <Text variant="labelLarge">Set as default receipt printer</Text>
                  <Text variant="bodySmall" style={styles.hintText}>
                    Auto-connect on collection screens
                  </Text>
                </View>
              </View>
              <Switch value={autoDefault} onValueChange={setAutoDefault} color={PRIMARY} />
            </View>

            <View style={styles.infoBanner}>
              <Icon source="information-outline" size={18} color={PRIMARY} />
              <Text variant="bodySmall" style={styles.infoText}>
                Turn on printer Bluetooth before pairing. Press the printer feed button twice if
                not listed.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              icon="bluetooth"
              loading={isConnecting}
              disabled={!selectedDevice || isConnecting}
              onPress={handlePairAndConnect}
              contentStyle={styles.footerButtonContent}
            >
              {selectedDevice?.paired ? "Connect" : "Pair & Connect"}
            </Button>
          </View>
        </>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.readyCard}>
              <View style={styles.readyIconWrap}>
                <Icon source="check-circle" size={40} color={SUCCESS} />
              </View>
              <View style={styles.readyChip}>
                <Text variant="labelSmall" style={styles.readyChipText}>
                  Connected & Ready
                </Text>
              </View>
              <Text variant="titleMedium" style={styles.readyDeviceName}>
                {connectedDevice?.name ?? "Printer"}
              </Text>
              <Text variant="bodySmall" style={styles.hintText}>
                Connected via Bluetooth ({connectedDevice?.address ?? "unknown"})
              </Text>

              <View style={styles.verifyRow}>
                <Icon source="receipt-text-outline" size={20} color={PRIMARY} />
                <View style={styles.verifyText}>
                  <Text variant="labelLarge">Verify Thermal Print</Text>
                  <Text variant="bodySmall" style={styles.hintText}>
                    Feeds a short test line to check paper feed and print clarity
                  </Text>
                </View>
              </View>

              <Button
                mode="outlined"
                icon="printer-outline"
                loading={isPrinting}
                disabled={isPrinting}
                onPress={handleTestPrint}
                style={styles.testPrintButton}
              >
                Print Test Slip
              </Button>
            </View>

            <Button mode="text" textColor={DANGER} icon="bluetooth-off" onPress={handleForget}>
              Disconnect or Forget Printer
            </Button>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              icon="check"
              onPress={() => onConnectSuccess?.()}
              contentStyle={styles.footerButtonContent}
            >
              Continue to Print Receipt
            </Button>
            {connectedDevice && connectedDevice.address === defaultAddress && (
              <Text variant="bodySmall" style={styles.footerCaption}>
                {connectedDevice.name} is selected as default for all collection slips
              </Text>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function DeviceRow({
  device,
  isSelected,
  badgeLabel,
  onPress,
}: {
  device: PrinterDevice;
  isSelected: boolean;
  badgeLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
      activeOpacity={0.7}
    >
      <View style={styles.deviceCardIconWrap}>
        <Icon source="printer" size={20} color={isSelected ? PRIMARY : "#666"} />
      </View>
      <View style={styles.deviceCardDetails}>
        <Text variant="labelLarge">{device.name}</Text>
        <Text variant="bodySmall" style={styles.hintText}>
          {device.address}
        </Text>
      </View>
      <View style={[styles.badge, isSelected && styles.badgeSelected]}>
        <Text
          variant="labelSmall"
          style={[styles.badgeText, isSelected && styles.badgeTextSelected]}
        >
          {badgeLabel}
        </Text>
      </View>
      <Icon
        source={isSelected ? "check-circle" : "checkbox-blank-circle-outline"}
        size={22}
        color={isSelected ? PRIMARY : "#C7C7CC"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F5F5F5",
  },
  headerButton: {
    margin: 0,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "700",
    color: "#000",
  },
  headerSubtitle: {
    color: "#666",
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  scanBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  scanBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  scanIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E7F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    color: "#666",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontWeight: "700",
  },
  countChip: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countChipText: {
    color: "#666",
  },
  deviceList: {
    gap: 10,
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 12,
  },
  deviceCardSelected: {
    borderColor: PRIMARY,
  },
  deviceCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceCardDetails: {
    flex: 1,
    alignItems: "flex-start",
  },
  badge: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSelected: {
    backgroundColor: "#E8F5E9",
  },
  badgeText: {
    color: "#666",
  },
  badgeTextSelected: {
    color: "#1B7F3A",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    padding: 20,
  },
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  defaultRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  defaultRowText: {
    flexShrink: 1,
  },
  infoBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    color: "#3A3A3C",
  },
  footer: {
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  footerButtonContent: {
    height: 48,
  },
  footerCaption: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
  },
  readyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  readyIconWrap: {
    marginBottom: 8,
  },
  readyChip: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  readyChipText: {
    color: "#1B7F3A",
  },
  readyDeviceName: {
    fontWeight: "700",
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    marginTop: 20,
    marginBottom: 12,
  },
  verifyText: {
    flex: 1,
  },
  testPrintButton: {
    alignSelf: "stretch",
  },
});
