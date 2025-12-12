import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Icon, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Deposits() {
  const [amount, setAmount] = useState("0.00");
  const [date, setDate] = useState("05/16/2024");
  const [receipt, setReceipt] = useState<string | null>(null);

  const handleUploadReceipt = () => {
    console.log("Upload receipt");
    // Handle file upload
  };

  const handleConfirmDeposit = () => {
    console.log("Confirm deposit", { amount, date, receipt });
    // Handle deposit confirmation
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Total Daily Amount */}
          <View style={styles.fieldContainer}>
            <Text variant="titleMedium" style={styles.label}>
              Total Daily Amount
            </Text>
            <TextInput
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="$" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
            />
          </View>

          {/* Deposit Date */}
          <View style={styles.fieldContainer}>
            <Text variant="titleMedium" style={styles.label}>
              Deposit Date
            </Text>
            <TextInput
              mode="outlined"
              value={date}
              onChangeText={setDate}
              right={<TextInput.Icon icon="calendar" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
            />
          </View>

          {/* Proof of Payment */}
          <View style={styles.fieldContainer}>
            <Text variant="titleMedium" style={styles.label}>
              Proof of Payment
            </Text>
            <TouchableOpacity
              style={styles.uploadContainer}
              onPress={handleUploadReceipt}
            >
              <Icon source="cloud-upload" size={48} color="#4A90E2" />
              <Text variant="titleMedium" style={styles.uploadTitle}>
                Upload Receipt
              </Text>
              <Text variant="bodyMedium" style={styles.uploadSubtitle}>
                Tap to select a file
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <Button
            mode="contained"
            onPress={handleConfirmDeposit}
            style={styles.confirmButton}
            labelStyle={styles.confirmButtonText}
            contentStyle={styles.confirmButtonContent}
          >
            Confirm Daily Deposit
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  fieldContainer: {
    marginBottom: 32,
  },
  label: {
    color: "#333",
    marginBottom: 12,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    fontSize: 18,
  },
  inputOutline: {
    borderRadius: 8,
    borderColor: "#E0E0E0",
  },
  inputContent: {
    paddingHorizontal: 12,
  },
  uploadContainer: {
    backgroundColor: "#F8FCFF",
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    color: "#4A90E2",
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 4,
  },
  uploadSubtitle: {
    color: "#4A90E2",
    fontSize: 14,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: "#F5F5F5",
  },
  confirmButton: {
    borderRadius: 12,
    backgroundColor: "#4A90E2",
  },
  confirmButtonContent: {
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
