import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import PrinterManager from "../components/PrinterManager";

export default function PrinterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const redirectBack = params.redirectBack === "true";

  const handleConnectSuccess = () => {
    if (redirectBack) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Printer</Text>
      </View>
      <PrinterManager onConnectSuccess={handleConnectSuccess} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
});
