import { TransactionForm } from '@/components/TransactionForm';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { actions } from '@/store/actions';
import { store$ } from '@/store/store';
import { TransactionPayload } from '@/types/user';
import { useSelector } from '@legendapp/state/react';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

function getDisplayDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UserDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const account = Array.isArray(params.account)
    ? params.account[0]
    : params.account;
  const accountNumber = Number(account);
  const storedCustomer = useSelector(store$.customers[accountNumber]);

  // Parse customer data from params
  const customer = {
    id: params.id as string,
    name: params.name as string,
    agentCode: Number(
      Array.isArray(params.agentCode) ? params.agentCode[0] : params.agentCode
    ),
    bankCode: params.bankCode as string,
    balance:
      storedCustomer?.currentBalance ??
      Number(Array.isArray(params.balance) ? params.balance[0] : params.balance),
    account: account as string,
    image: params.image as string,
    mobilenumber: params.mobilenumber as string,
  };

  const [amount, setAmount] = useState('');
  const [scheme, setScheme] = useState('');
  const [date] = useState(getDisplayDate);

  const handleConfirm = async () => {
    const payload: TransactionPayload = {
      userId: Number(customer.id),
      agentCode: customer.agentCode,
      bankCode: customer.bankCode,
      collectedAmount: Number(amount),
      schemename: scheme,
      collectiontype: 'cash',
      customerName: customer.name,
      accountNumber: Number(customer.account),
      transactionId: Crypto.randomUUID(),
    };
    console.log('Confirming transaction with payload:', payload);
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
