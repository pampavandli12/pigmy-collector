import { usePrinter } from '@/contexts/PrinterContext';
import { ReceiptData, ReceiptPrinter } from '@/utils/ReceiptPrinter';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useState, useEffect, useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Icon, Text } from 'react-native-paper';

interface TransactionSuccessProps {
  customerName?: string;
  customerId?: string;
  amount?: string;
  scheme?: string;
  date?: string;
  mobilenumber?: string;
  onPrintReceipt?: () => void;
  onDone?: () => void;
}

export const TransactionSuccess = ({
  customerName = 'SRIRAM.S',
  customerId = '60001',
  amount = '255',
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
  const [shouldPrintOnConnect, setShouldPrintOnConnect] = useState(false);
  const router = useRouter();

  const onSendSms = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(
        [mobilenumber],
        `Dear ${customerName}, ₹${amount} has been collected successfully towards ${scheme} on ${date}. Account No: ${customerId}. Thank you for banking with us.`,
      );
    } else {
      Alert.alert(
        'SMS Not Available',
        'Sorry, SMS functionality is not available on this device.',
      );
    }
  };

  const onPrintReceipt = useCallback(async () => {
    if (!isConnected) {
      setShouldPrintOnConnect(true);
      router.push({
        pathname: '/printer',
        params: { redirectBack: 'true' },
      });
      return;
    }

    setIsPrinting(true);
    const numericAmount = Number(amount.replace(/[^0-9.]/g, '')) || 0;
    const receiptData: ReceiptData = {
      storeName: 'PIGMY COLLECTOR',
      storeAddress: 'Daily Collection System',
      phone: mobilenumber || undefined,
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
      footer: `Customer: ${customerName}`,
    };

    const success = await ReceiptPrinter.printReceipt(receiptData);
    setIsPrinting(false);

    if (success) {
      Alert.alert('Success', 'Receipt printed successfully!');
    } else {
      Alert.alert('Error', 'Failed to print receipt');
    }
  }, [isConnected, amount, mobilenumber, customerId, date, scheme, customerName, router]);

  useEffect(() => {
    if (isConnected && shouldPrintOnConnect) {
      setShouldPrintOnConnect(false);
      onPrintReceipt();
    }
  }, [isConnected, shouldPrintOnConnect, onPrintReceipt]);
  return (
    <View style={styles.container}>
      <View style={styles.content}>
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

        <View style={styles.actionRow}>
          <Button
            mode='outlined'
            onPress={onSendSms}
            style={[
              styles.actionButton,
              styles.actionButtonLeft,
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
            style={[styles.actionButton, styles.printButton]}
            labelStyle={styles.actionLabel}
            contentStyle={styles.actionContent}
            icon='printer'
            loading={isPrinting}
            disabled={isPrinting}
          >
            Print Receipt
          </Button>
        </View>
      </View>

      <View style={styles.footer}>
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
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
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
  actionButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
  },
  actionButtonLeft: {
    marginRight: 12,
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
    paddingTop: 16,
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
