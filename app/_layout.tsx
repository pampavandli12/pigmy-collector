import { DB_NAME, TABLE_NAME } from '@/utils/constants';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { AppSnackbar } from '../components/AppSnackbar';
import { PrinterProvider } from '../contexts/PrinterContext';
import { AuthProvider, useAuth } from './providers/AuthProvider';

async function initDb(db: any) {
  await db.execAsync(`
             PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             userId TEXT NOT NULL,
             collectedAmount REAL NOT NULL,
             accountNumber TEXT NOT NULL,
             agentCode INTEGER NOT NULL,
             bankCode TEXT NOT NULL,
             customerName TEXT NOT NULL,
             date TEXT NOT NULL,
             collectiontype TEXT NOT NULL,
             schemename TEXT NOT NULL
             );
         `);
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    secondary: '#5856D6',
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontFamily: 'Roboto_400Regular',
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontFamily: 'Roboto_400Regular',
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontFamily: 'Roboto_400Regular',
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontFamily: 'Roboto_500Medium',
    },
    labelMedium: {
      ...MD3LightTheme.fonts.labelMedium,
      fontFamily: 'Roboto_500Medium',
    },
    labelSmall: {
      ...MD3LightTheme.fonts.labelSmall,
      fontFamily: 'Roboto_500Medium',
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontFamily: 'Roboto_700Bold',
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontFamily: 'Roboto_500Medium',
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontFamily: 'Roboto_500Medium',
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontFamily: 'Roboto_700Bold',
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontFamily: 'Roboto_700Bold',
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontFamily: 'Roboto_700Bold',
    },
  },
};

const InitialLayout = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name='index' options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
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
      <SQLiteProvider databaseName={DB_NAME} onInit={initDb}>
        <PrinterProvider>
          <AuthProvider>
            <InitialLayout />
          </AuthProvider>
        </PrinterProvider>
      </SQLiteProvider>
      <AppSnackbar />
    </PaperProvider>
  );
}
