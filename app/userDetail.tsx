import { TransactionForm } from '@/components/TransactionForm';
import {
  getRegisteredBankAdapter,
  UNSUPPORTED_BANK_DEPOSIT_MESSAGE,
} from '@/services/banks/registry';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { useAuth } from '@/providers/AuthProvider';
import { actions } from '@/store/actions';
import { todaysCollectionAmount$ } from '@/store/selectors';
import { store$ } from '@/store/store';
import {
  INVALID_DEPOSIT_MESSAGE,
  SCHEME_REQUIRED_MESSAGE,
  transactionPayloadSchema,
  UNABLE_TO_SAVE_DEPOSIT_MESSAGE,
} from '@/types/user';
import {
  COLLECTION_LIMIT_EXCEEDED_MESSAGE,
  evaluateCollectionLimit,
} from '@/utils/collectionLimit';
import {
  evaluateGracePeriod,
  GRACE_PERIOD_EXCEEDED_MESSAGE,
} from '@/utils/gracePeriod';
import { parseDepositAmount } from '@/utils/depositAmount';
import { getErrorMessage } from '@/utils/errors';
import { showSnackbar } from '@/utils/snackbar';
import { useSelector } from '@legendapp/state/react';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TransactionSuccessSnapshot {
  amount: number;
  openingBalance: number;
  totalBalance: number;
}

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
  const { user } = useAuth();
  const [transactionSuccess, setTransactionSuccess] =
    useState<TransactionSuccessSnapshot | null>(null);
  // Route params can be string | string[] | undefined (deep link, back-stack
  // restore). Coerce every field defensively so a missing param renders a safe
  // empty state instead of crashing (e.g. `customer.name.charAt(0)`).
  const firstParam = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value) ?? '';

  const account = firstParam(params.account);
  const accountNumber = Number(account);
  const storedCustomer = useSelector(store$.customers[accountNumber]);
  const todaysCollected = useSelector(todaysCollectionAmount$);

  // Parse customer data from params
  const customer = {
    id: firstParam(params.id),
    name: firstParam(params.name),
    agentCode: Number(firstParam(params.agentCode)),
    bankCode: firstParam(params.bankCode),
    balance:
      storedCustomer?.currentBalance ?? Number(firstParam(params.balance) || 0),
    account,
    image: firstParam(params.image),
    mobilenumber: firstParam(params.mobilenumber),
  };

  const [amount, setAmount] = useState('');
  const [scheme, setScheme] = useState('');
  const [date] = useState(getDisplayDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const gracePeriod = evaluateGracePeriod(
    user?.lastDepositDate,
    user?.graceDays,
  );
  const collectionLimit = evaluateCollectionLimit(
    user?.limitAmount,
    todaysCollected,
  );
  const blockedMessage = !gracePeriod.allowed
    ? GRACE_PERIOD_EXCEEDED_MESSAGE
    : !collectionLimit.allowed
      ? COLLECTION_LIMIT_EXCEEDED_MESSAGE
      : null;

  const handleConfirm = () => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);

    const release = () => {
      submittingRef.current = false;
      setIsSubmitting(false);
    };

    try {
      const currentGracePeriod = evaluateGracePeriod(
        user?.lastDepositDate,
        user?.graceDays,
      );

      if (!currentGracePeriod.allowed) {
        showSnackbar(GRACE_PERIOD_EXCEEDED_MESSAGE, {
          type: 'error',
          duration: 6000,
        });
        release();
        return;
      }

      const numericAmount = parseDepositAmount(amount);
      if (numericAmount === null) {
        showSnackbar(INVALID_DEPOSIT_MESSAGE, { type: 'error' });
        release();
        return;
      }
      const currentCollectionLimit = evaluateCollectionLimit(
        user?.limitAmount,
        todaysCollected,
        numericAmount,
      );

      if (!currentCollectionLimit.allowed) {
        showSnackbar(COLLECTION_LIMIT_EXCEEDED_MESSAGE, {
          type: 'error',
          duration: 6000,
        });
        release();
        return;
      }
      const selectedScheme = user?.schemes?.find(
        (item) => item.schemeId === String(scheme),
      );
      if (!selectedScheme) {
        showSnackbar(SCHEME_REQUIRED_MESSAGE, { type: 'error' });
        release();
        return;
      }
      const adapter = getRegisteredBankAdapter(user?.bankType);
      if (!adapter) {
        showSnackbar(UNSUPPORTED_BANK_DEPOSIT_MESSAGE, { type: 'error' });
        release();
        return;
      }
      const openingBalance = Number(customer.balance || 0);
      const payload = adapter.buildPayload({
        userId: Number(customer.id),
        agentCode: customer.agentCode,
        bankCode: customer.bankCode,
        collectedAmount: numericAmount,
        schemename: selectedScheme.schemeName,
        schemeId: selectedScheme.schemeId,
        collectiontype: 'cash',
        customerName: customer.name,
        accountNumber: Number(customer.account),
        transactionId: Crypto.randomUUID(),
        openingBalance,
        agentName: user?.agentName,
      });
      const parsedPayload = transactionPayloadSchema.safeParse(payload);
      if (!parsedPayload.success) {
        showSnackbar(UNABLE_TO_SAVE_DEPOSIT_MESSAGE, { type: 'error' });
        release();
        return;
      }
      if (!actions.addTransaction(parsedPayload.data)) {
        release();
        return;
      }
      setTransactionSuccess({
        amount: numericAmount,
        openingBalance,
        totalBalance: openingBalance + numericAmount,
      });
    } catch (error: unknown) {
      showSnackbar(getErrorMessage(error, UNABLE_TO_SAVE_DEPOSIT_MESSAGE), {
        type: 'error',
      });
      release();
    }
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
        {/*
          A completed deposit takes priority over the "blocked" gate: the deposit
          that pushes today's total up to the limit is itself valid and its
          receipt/print/WhatsApp actions must still be shown. The blocked gate only
          prevents STARTING a new deposit when already over the limit / past grace.
        */}
        {transactionSuccess ? (
          <TransactionSuccess
            customerName={customer.name}
            customerId={customer.id}
            accountNumber={customer.account}
            amount={`₹${transactionSuccess.amount}`}
            openingBalance={transactionSuccess.openingBalance}
            totalBalance={transactionSuccess.totalBalance}
            scheme={
              user?.schemes?.find((item) => item.schemeId === String(scheme))
                ?.schemeName ?? ''
            }
            date={date}
            mobilenumber={customer.mobilenumber}
            onDone={() => router.back()}
          />
        ) : blockedMessage ? (
          <View style={styles.blockedContainer}>
            <Icon source='alert-circle' size={56} color='#C62828' />
            <Text variant='titleMedium' style={styles.blockedMessage}>
              {blockedMessage}
            </Text>
            <Button mode='contained' onPress={() => router.back()}>
              Back to Users
            </Button>
          </View>
        ) : (
          <TransactionForm
            customer={customer}
            amount={amount}
            setAmount={setAmount}
            scheme={scheme}
            setScheme={setScheme}
            date={date}
            handleConfirm={handleConfirm}
            isTransactionLoading={isSubmitting}
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
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  blockedMessage: {
    color: '#C62828',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
