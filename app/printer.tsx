/** Modal screen hosting `PrinterManager`; optionally navigates back on a successful connect (`redirectBack` param). */
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import PrinterManager from "../components/PrinterManager";

export default function PrinterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const redirectBack = params.redirectBack === "true";

  const handleConnectSuccess = () => {
    // Guard against a stale navigator: if the app re-locked (or the stack
    // otherwise changed) while connecting, GO_BACK has nothing to handle it.
    if (redirectBack && router.canGoBack()) {
      router.back();
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <PrinterManager onConnectSuccess={handleConnectSuccess} onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
