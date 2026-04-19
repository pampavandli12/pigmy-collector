import { Status } from '@/types/sharedEnums';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import useUser from './store/userStore';

export default function UserDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const createTransactionStatus = useUser(
    (state) => state.createTransactionStatus,
  );
  const createTransaction = useUser((state) => state.createTransaction);

  // Parse customer data from params
  const customer = {
    id: params.id as string,
    name: params.name as string,
    agentCode: parseInt(params.agentCode as string, 10),
    bankCode: params.bankCode as string,
    balance: parseFloat(params.balance as string),
    account: params.account as string,
    image: params.image as string,
  };

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(
      new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    );
  }, [setDate]);
  const handleConfirm = async () => {
    console.log('Confirm deposit', { customer, amount, date });
    const payload = {
      userId: parseInt(customer.id),
      agentCode: customer.agentCode,
      bankCode: customer.bankCode,
      collectedAmount: parseFloat(amount),
      schemename: 'Default Scheme',
      collectiontype: 'Cash',
      customerName: customer.name,
      accountNumber: parseInt(customer.account),
    };
    await createTransaction(payload);
    // Handle deposit confirmation
    router.back();
  };
  const isTransactionLoading = createTransactionStatus === Status.Loading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon='arrow-left'
            size={24}
            iconColor='#000'
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text variant='headlineSmall' style={styles.headerTitle}>
            New Deposit
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Customer Info Card */}
          <Card style={styles.customerCard}>
            <Card.Content style={styles.customerContent}>
              <Avatar.Text
                size={45}
                label={customer.name.charAt(0).toUpperCase()}
                style={styles.avatar}
              />
              <View style={styles.customerInfo}>
                <Text variant='titleLarge' style={styles.customerName}>
                  {customer.name}
                </Text>
                <Text variant='bodyMedium' style={styles.customerId}>
                  ID: {customer.id}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Deposit Details Section */}
          <View style={styles.detailsSection}>
            <Text variant='titleLarge' style={styles.sectionTitle}>
              Deposit Details
            </Text>

            {/* Amount Field */}
            <View style={styles.fieldContainer}>
              <Text variant='bodyMedium' style={styles.fieldLabel}>
                Amount
              </Text>
              <TextInput
                mode='flat'
                value={amount}
                onChangeText={setAmount}
                keyboardType='decimal-pad'
                style={styles.amountInput}
                contentStyle={styles.amountInputContent}
                underlineStyle={{ height: 0 }}
                activeUnderlineColor='transparent'
              />
            </View>

            {/* Date Field */}
            <View style={styles.fieldContainer}>
              <Text variant='titleMedium' style={styles.fieldLabel}>
                Date
              </Text>
              <View style={styles.dateContainer}>
                <Text variant='titleMedium' style={styles.dateValue}>
                  {date}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <Button
            mode='contained'
            onPress={handleConfirm}
            style={styles.confirmButton}
            loading={isTransactionLoading}
            labelStyle={styles.confirmButtonText}
            contentStyle={styles.confirmButtonContent}
          >
            Confirm + Save
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    margin: 0,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  customerCard: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  customerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  customerId: {
    color: '#999',
  },
  chevron: {
    margin: 0,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 32,
  },
  fieldLabel: {
    color: '#999',
    marginBottom: 8,
    fontSize: 14,
  },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 0,
    height: 60,
  },
  amountInputContent: {
    paddingLeft: 16,
    paddingTop: 8,
  },
  dateContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dateValue: {
    color: '#000',
    fontSize: 16,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  confirmButtonContent: {
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
