import { TransactionForm } from '@/components/TransactionForm';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { Status } from '@/types/sharedEnums';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
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
    mobilenumber: params.mobilenumber as string,
  };

  const [amount, setAmount] = useState('');
  const [scheme, setScheme] = useState('');
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
  useEffect(() => {
    return () => {
      // Reset transaction status when leaving the screen
      // This ensures that if the user comes back to this screen, it will show the form instead of the success message
      if (
        createTransactionStatus === Status.Success ||
        createTransactionStatus === Status.Error
      ) {
        // Reset to idle so that form is shown when user comes back
        useUser.setState({ createTransactionStatus: Status.Idle });
      }
    };
  }, []);
  const handleConfirm = async () => {
    const payload = {
      userId: parseInt(customer.id, 10),
      agentCode: customer.agentCode,
      bankCode: customer.bankCode,
      collectedAmount: parseFloat(amount),
      schemename: scheme,
      collectiontype: 'cash',
      customerName: customer.name,
      accountNumber: parseInt(customer.account, 10),
    };
    await createTransaction(payload);
    // Handle deposit confirmation
    //router.back();
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
        {/* Transaction Form */}
        {createTransactionStatus === Status.Success ? (
          <TransactionSuccess
            customerName={customer.name}
            customerId={customer.id}
            amount={`₹${amount}`}
            scheme={scheme}
            date={date}
            mobilenumber={customer.mobilenumber}
            onDone={() => router.back()}
          />
        ) : (
          <TransactionForm
            customer={customer}
            amount={amount}
            setAmount={setAmount}
            scheme={scheme}
            setScheme={setScheme}
            date={date}
            handleConfirm={handleConfirm}
            isTransactionLoading={isTransactionLoading}
          />
        )}
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
});
