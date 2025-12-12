import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { PrinterProvider } from "../contexts/PrinterContext";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#007AFF",
    secondary: "#5856D6",
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontFamily: "Roboto_400Regular",
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontFamily: "Roboto_400Regular",
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontFamily: "Roboto_400Regular",
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontFamily: "Roboto_500Medium",
    },
    labelMedium: {
      ...MD3LightTheme.fonts.labelMedium,
      fontFamily: "Roboto_500Medium",
    },
    labelSmall: {
      ...MD3LightTheme.fonts.labelSmall,
      fontFamily: "Roboto_500Medium",
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontFamily: "Roboto_700Bold",
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontFamily: "Roboto_500Medium",
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontFamily: "Roboto_500Medium",
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontFamily: "Roboto_700Bold",
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontFamily: "Roboto_700Bold",
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontFamily: "Roboto_700Bold",
    },
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <PrinterProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="printer"
            options={{
              headerShown: true,
              title: "Printer Settings",
              presentation: "modal",
            }}
          />
        </Stack>
      </PrinterProvider>
    </PaperProvider>
  );
}
