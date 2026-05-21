import { TransactionForm } from '@/components/TransactionForm';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { actions } from '@/store/actions';
import { TransactionPayload } from '@/types/user';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [transactionSuccess, setTransactionSuccess] = useState(false);
  // Parse customer data from params
  const customer = {
    id: params.id as string,
    name: params.name as string,
    agentCode: Array.isArray(params.agentCode)
      ? params.agentCode[0]
      : params.agentCode,
    bankCode: params.bankCode as string,
    balance: params.balance,
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

  const handleConfirm = async () => {
    const payload: TransactionPayload = {
      userId: Number(customer.id),
      agentCode: Number(customer.agentCode),
      bankCode: customer.bankCode,
      collectedAmount: Number(amount),
      schemename: scheme,
      collectiontype: 'cash',
      customerName: customer.name,
      accountNumber: Number(customer.account),
      transactionId: `tx-${Date.now()}`,
    };
    actions.addTransaction(payload);
    setTransactionSuccess(true);
    // Handle deposit confirmation
    //router.back();
  };

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
        {transactionSuccess ? (
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
            isTransactionLoading={false}
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
