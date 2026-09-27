import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  List,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrinter } from '../../contexts/PrinterContext';

const APP_VERSION = '1.0.0';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Support() {
  const { user, accounts, logout } = useAuth();
  const { isConnected, connectedDevice } = usePrinter();
  const router = useRouter();

  const accountCount = accounts?.length ?? 0;

  const initials = useMemo(
    () => getInitials(user?.agentName ?? ''),
    [user?.agentName],
  );

  const schemeLabel = useMemo(() => {
    const schemes = user?.schemes ?? [];
    if (schemes.length === 0) return null;
    if (schemes.length === 1) return schemes[0].schemeName;
    return `${schemes.length} schemes`;
  }, [user?.schemes]);

  const handleSetupPrinter = () => {
    router.push({
      pathname: '/printer',
      params: { redirectBack: 'true' },
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      `Log out ${user?.agentName ?? 'this account'}? Any unsynced collections stay on the device until you log back in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void logout();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text variant='headlineMedium' style={styles.screenTitle}>
          Settings
        </Text>

        {/* Profile */}
        <Card style={styles.profileCard} mode='contained'>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={64}
              label={initials}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <View style={styles.profileInfo}>
              <Text variant='titleLarge' style={styles.profileName}>
                {user?.agentName ?? 'Agent'}
              </Text>
              <View style={styles.profileMetaRow}>
                <Icon source='phone' size={14} color='#5A6B82' />
                <Text variant='bodyMedium' style={styles.profileMeta}>
                  {user?.phoneNumber ?? '—'}
                </Text>
              </View>
              <View style={styles.chipRow}>
                {user?.bankName ? (
                  <Chip
                    compact
                    icon='bank'
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {user.bankName}
                  </Chip>
                ) : null}
                {schemeLabel ? (
                  <Chip
                    compact
                    icon='file-document-outline'
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {schemeLabel}
                  </Chip>
                ) : null}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Agent details */}
        <Text variant='labelLarge' style={styles.sectionLabel}>
          AGENT DETAILS
        </Text>
        <Card style={styles.groupCard} mode='contained'>
          <List.Item
            title='Agent code'
            description={user ? String(user.agentCode) : '—'}
            left={(props) => <List.Icon {...props} icon='identifier' color='#4A90E2' />}
          />
          <Divider style={styles.divider} />
          <List.Item
            title='Deposit limit'
            description={formatAmount(user?.limitAmount)}
            left={(props) => <List.Icon {...props} icon='cash' color='#4A90E2' />}
          />
          <Divider style={styles.divider} />
          <List.Item
            title='Grace period'
            description={
              user?.graceDays != null ? `${user.graceDays} days` : '—'
            }
            left={(props) => (
              <List.Icon {...props} icon='calendar-clock' color='#4A90E2' />
            )}
          />
          <Divider style={styles.divider} />
          <List.Item
            title='Last deposit'
            description={user?.lastDepositDate ?? 'No deposits yet'}
            left={(props) => (
              <List.Icon {...props} icon='history' color='#4A90E2' />
            )}
          />
        </Card>

        {/* Devices */}
        <Text variant='labelLarge' style={styles.sectionLabel}>
          DEVICES
        </Text>
        <Card style={styles.groupCard} mode='contained'>
          <List.Item
            title='Bluetooth printer'
            description={
              isConnected
                ? `Connected${connectedDevice?.name ? ` · ${connectedDevice.name}` : ''}`
                : 'Not connected'
            }
            onPress={handleSetupPrinter}
            left={(props) => (
              <List.Icon {...props} icon='printer' color='#4A90E2' />
            )}
            right={(props) => (
              <View style={styles.printerRight}>
                <View
                  style={[
                    styles.statusDot,
                    isConnected ? styles.statusDotOn : styles.statusDotOff,
                  ]}
                />
                <List.Icon {...props} icon='chevron-right' color='#B0B8C4' />
              </View>
            )}
          />
        </Card>

        {/* Accounts */}
        <Text variant='labelLarge' style={styles.sectionLabel}>
          ACCOUNT
        </Text>
        <Card style={styles.groupCard} mode='contained'>
          <List.Item
            title='Linked agent accounts'
            description={`${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} on this device`}
            left={(props) => (
              <List.Icon {...props} icon='account-group' color='#4A90E2' />
            )}
          />
          <Divider style={styles.divider} />
          <List.Item
            title='App version'
            description={APP_VERSION}
            left={(props) => (
              <List.Icon {...props} icon='information-outline' color='#4A90E2' />
            )}
          />
        </Card>

        <View style={styles.footer}>
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
          <Button
            mode='outlined'
            icon='logout'
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={styles.logoutText}
            contentStyle={styles.buttonContent}
            textColor='#C62828'
          >
            Log out current account
          </Button>
        </View>

        <Text variant='bodySmall' style={styles.tagline}>
          Pigmy Collector · v{APP_VERSION}
        </Text>
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
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontWeight: '700',
    color: '#1A2233',
    marginTop: 12,
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    backgroundColor: '#4A90E2',
  },
  avatarLabel: {
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontWeight: '700',
    color: '#1A2233',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  profileMeta: {
    color: '#5A6B82',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    backgroundColor: '#EAF2FC',
  },
  chipText: {
    color: '#2C5A8C',
    fontSize: 12,
  },
  sectionLabel: {
    color: '#8A96A6',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  divider: {
    marginLeft: 56,
    backgroundColor: '#EEF1F5',
  },
  printerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  statusDotOn: {
    backgroundColor: '#2E7D32',
  },
  statusDotOff: {
    backgroundColor: '#C4CBD4',
  },
  footer: {
    marginTop: 28,
    gap: 12,
  },
  printerButton: {
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  logoutButton: {
    borderRadius: 12,
    borderColor: '#F0C4C4',
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C62828',
  },
  tagline: {
    textAlign: 'center',
    color: '#B0B8C4',
    marginTop: 24,
  },
});
