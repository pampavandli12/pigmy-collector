import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export default function SignIn() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"english" | "kannada">("english");

  const handleSignIn = async () => {
    setLoading(true);
    // Simulate sign-in process
    setTimeout(() => {
      setLoading(false);
      // Navigate to tabs after sign-in
      router.replace("/(tabs)/dashboard");
    }, 1000);
  };

  const handleOTPLogin = () => {
    // Handle OTP login
    console.log("Login with OTP");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Agent Login
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            mode="flat"
            style={styles.input}
            autoCapitalize="none"
            left={<TextInput.Icon icon="account-outline" />}
            underlineStyle={{ height: 0 }}
            contentStyle={styles.inputContent}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            mode="flat"
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            underlineStyle={{ height: 0 }}
            contentStyle={styles.inputContent}
          />

          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || !username || !password}
            style={styles.loginButton}
            labelStyle={styles.loginButtonText}
          >
            Login
          </Button>

          <Button
            mode="outlined"
            onPress={handleOTPLogin}
            style={styles.otpButton}
            labelStyle={styles.otpButtonText}
            contentStyle={styles.otpButtonContent}
          >
            Login with OTP
          </Button>
        </View>

        <View style={styles.languageSection}>
          <Text variant="bodyMedium" style={styles.languageLabel}>
            Select Language
          </Text>
          <View style={styles.languageButtons}>
            <Button
              mode={language === "english" ? "contained" : "outlined"}
              onPress={() => setLanguage("english")}
              style={[
                styles.languageButton,
                language === "english" && styles.languageButtonActive,
              ]}
              labelStyle={[
                styles.languageButtonText,
                language === "english" && styles.languageButtonTextActive,
              ]}
              contentStyle={styles.languageButtonContent}
            >
              English
            </Button>
            <Button
              mode={language === "kannada" ? "contained" : "outlined"}
              onPress={() => setLanguage("kannada")}
              style={[
                styles.languageButton,
                language === "kannada" && styles.languageButtonActive,
              ]}
              labelStyle={[
                styles.languageButtonText,
                language === "kannada" && styles.languageButtonTextActive,
              ]}
              contentStyle={styles.languageButtonContent}
            >
              ಕನ್ನಡ
            </Button>
          </View>
        </View>

        <Text variant="bodySmall" style={styles.footer}>
          © 2024 Bank Co. All rights reserved.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFEFEF",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    color: "#000",
    marginBottom: 60,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#D9D9D9",
    marginBottom: 20,
    borderRadius: 8,
    height: 60,
  },
  inputContent: {
    paddingLeft: 8,
  },
  loginButton: {
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 25,
    height: 56,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0,
  },
  otpButton: {
    borderRadius: 25,
    height: 56,
    backgroundColor: "#D6E9F8",
    borderColor: "#D6E9F8",
    justifyContent: "center",
  },
  otpButtonContent: {
    height: 56,
  },
  otpButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4A90E2",
    letterSpacing: 0,
  },
  languageSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  languageLabel: {
    color: "#666",
    marginBottom: 16,
    fontSize: 16,
  },
  languageButtons: {
    flexDirection: "row",
    gap: 16,
  },
  languageButton: {
    borderRadius: 25,
    borderColor: "#D9D9D9",
    backgroundColor: "transparent",
    minWidth: 120,
  },
  languageButtonActive: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  languageButtonContent: {
    paddingHorizontal: 20,
    height: 44,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  languageButtonTextActive: {
    color: "#FFF",
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: 13,
  },
});
