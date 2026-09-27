import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Support() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  const handleSetupPrinter = () => {
    router.push({
      pathname: '/printer',
      params: { redirectBack: 'true' },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Setup Printer Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode='contained'
            icon='printer'
            onPress={handleSetupPrinter}
            style={styles.printerButton}
            labelStyle={styles.buttonText}
            contentStyle={styles.buttonContent}
          >
            Setup Printer
          </Button>
        </View>

        {/* Logout Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode='contained'
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={styles.buttonText}
            contentStyle={styles.buttonContent}
          >
            Log out current account
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  printerButton: {
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  logoutButton: {
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
