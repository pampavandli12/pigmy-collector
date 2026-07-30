import { usePrinter } from '@/contexts/PrinterContext';
import { useAuth } from '@/providers/AuthProvider';
import { ReceiptData, ReceiptPrinter } from '@/utils/ReceiptPrinter';
import { showSnackbar } from '@/utils/snackbar';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Avatar, Button, Card, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TransactionSuccessProps {
  customerName?: string;
  customerId?: string;
  accountNumber?: string;
  amount?: string;
  openingBalance: number;
  totalBalance: number;
  scheme?: string;
  date?: string;
  mobilenumber?: string;
  onDone?: () => void;
}

function formatIndianCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const TransactionSuccess = ({
  customerName = 'SRIRAM.S',
  customerId = '60001',
  accountNumber = customerId,
  amount = '255',
  openingBalance,
  totalBalance,
  scheme = 'Pigmy Deposit',
  mobilenumber = '',
  date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
  onDone,
}: TransactionSuccessProps) => {
  const initials = customerName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const { isConnected } = usePrinter();
  const [isPrinting, setIsPrinting] = useState(false);
  const shouldPrintOnConnect = useRef(false);
  const router = useRouter();
  const { user: agentInfo } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width < 380 || fontScale > 1.2;

  const onSendSms = async () => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(
          [mobilenumber],
          `Dear ${customerName}, ${amount} has been collected successfully towards ${scheme} on ${date}. Account No: ${accountNumber}. Total Balance: ${formatIndianCurrency(totalBalance)}. Thank you for banking with ${agentInfo?.bankName ?? 'us'}.`,
        );
      } else {
        showSnackbar('SMS is not available on this device.', { type: 'error' });
      }
    } catch {
      showSnackbar('Unable to open the SMS composer.', { type: 'error' });
    }
  };

  const onPrintReceipt = useCallback(async () => {
    if (!isConnected) {
      shouldPrintOnConnect.current = true;
      router.push({
        pathname: '/printer',
        params: { redirectBack: 'true' },
      });
      return;
    }

    setIsPrinting(true);
    const numericAmount = Number(amount.replace(/[^0-9.]/g, '')) || 0;
    const receiptData: ReceiptData = {
      bankName: agentInfo?.bankName,
      receiptNumber: `TX-${customerId}-${Date.now().toString().slice(-6)}`,
      date: date || new Date().toLocaleString(),
      items: [
        {
          name: `Deposit: ${scheme}`,
          quantity: 1,
          price: numericAmount,
          total: numericAmount,
        },
      ],
      subtotal: numericAmount,
      total: numericAmount,
      paymentMethod: 'Cash',
      customerName,
      accountNo: accountNumber,
      openingBalance,
      receivedAmount: numericAmount,
      totalBalance,
      collectorName: agentInfo?.agentName,
      collectorPhone: agentInfo?.phoneNumber,
    };

    const success = await ReceiptPrinter.printReceipt(receiptData);
    setIsPrinting(false);

    if (success) {
      Alert.alert('Success', 'Receipt printed successfully!');
    } else {
      showSnackbar('Failed to print receipt.', { type: 'error' });
    }
  }, [
    isConnected,
    amount,
    customerId,
    accountNumber,
    date,
    scheme,
    customerName,
    openingBalance,
    totalBalance,
    agentInfo,
    router,
  ]);

  useEffect(() => {
    if (isConnected && shouldPrintOnConnect.current) {
      shouldPrintOnConnect.current = false;
      onPrintReceipt();
    }
  }, [isConnected, onPrintReceipt]);
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.statusSection}>
          <View style={styles.statusCircle}>
            <Icon source='check' size={32} color='#0D9F59' />
          </View>
          <Text variant='headlineSmall' style={styles.statusText}>
            Transaction Successful
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.customerRow}>
              <Avatar.Text
                size={52}
                label={initials}
                style={styles.avatar}
                labelStyle={styles.avatarLabel}
              />
              <View style={styles.customerInfo}>
                <Text variant='titleLarge' style={styles.customerName}>
                  {customerName}
                </Text>
                <Text variant='bodyMedium' style={styles.customerId}>
                  ID: {customerId}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text variant='bodyMedium' style={styles.detailLabel}>
                Amount
              </Text>
              <Text variant='titleMedium' style={styles.detailValue}>
                {amount}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text variant='bodyMedium' style={styles.detailLabel}>
                Scheme
              </Text>
              <Text variant='titleMedium' style={styles.detailValue}>
                {scheme}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text variant='bodyMedium' style={styles.detailLabel}>
                Date
              </Text>
              <Text variant='titleMedium' style={styles.detailValue}>
                {date}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View
          style={[styles.actionRow, stackActions && styles.actionRowStacked]}
        >
          <Button
            mode='outlined'
            onPress={onSendSms}
            style={[
              styles.actionButton,
              !stackActions && styles.actionButtonLeft,
              stackActions && styles.stackedActionButton,
              styles.smsButton,
            ]}
            labelStyle={styles.actionLabel}
            contentStyle={styles.actionContent}
            icon='message-outline'
          >
            Send SMS
          </Button>
          <Button
            mode='outlined'
            onPress={onPrintReceipt}
            style={[
              styles.actionButton,
              stackActions && styles.stackedActionButton,
              styles.printButton,
            ]}
            labelStyle={styles.actionLabel}
            contentStyle={styles.actionContent}
            icon='printer'
            loading={isPrinting}
            disabled={isPrinting}
          >
            Print Receipt
          </Button>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Button
          mode='contained'
          onPress={onDone}
          style={styles.doneButton}
          labelStyle={styles.doneLabel}
          contentStyle={styles.doneContent}
        >
          Done
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#111827',
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    backgroundColor: '#4A90E2',
    marginRight: 16,
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customerId: {
    color: '#6B7280',
  },
  detailItem: {
    marginBottom: 20,
  },
  detailLabel: {
    color: '#6B7280',
    marginBottom: 6,
  },
  detailValue: {
    color: '#111827',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionRowStacked: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
  },
  actionButtonLeft: {
    marginRight: 12,
  },
  stackedActionButton: {
    flex: 0,
    width: '100%',
    marginBottom: 12,
  },
  smsButton: {
    borderColor: '#007AFF',
  },
  printButton: {
    borderColor: '#CCCCCC',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionContent: {
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F5F7FA',
  },
  doneButton: {
    borderRadius: 14,
    backgroundColor: '#007AFF',
  },
  doneLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  doneContent: {
    paddingVertical: 14,
  },
});
