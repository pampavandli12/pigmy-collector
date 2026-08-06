import { useSelector } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  IconButton,
  Searchbar,
  Text,
} from 'react-native-paper';

import { CustomerListItem } from '@/components/CustomerListItem';
import { store$ } from '@/store/store';

import { filteredCustomers$ } from '@/store/selectors';

import { useCustomerVoiceSearch } from '@/hooks/useCustomerVoiceSearch';
import { useAuth } from '@/providers/AuthProvider';
import { actions } from '@/store/actions';
import { Customer } from '@/types/user';
import {
  evaluateGracePeriod,
  GRACE_PERIOD_EXCEEDED_MESSAGE,
} from '@/utils/gracePeriod';
import { showSnackbar } from '@/utils/snackbar';

export default function Users() {
  const customers = useSelector(filteredCustomers$);
  const syncing = useSelector(store$.isRefreshingCustomers);
  const router = useRouter();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState(() =>
    store$.searchQuery.peek(),
  );
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);

  const handleVoiceResult = useCallback((transcript: string) => {
    setSearchText(transcript);
    store$.searchQuery.set(transcript);
  }, []);
  const voiceSearch = useCustomerVoiceSearch(handleVoiceResult);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (store$.searchQuery.peek() !== searchText) {
        store$.searchQuery.set(searchText);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const loadCustomers = useCallback(() => {
    if (!user) {
      return;
    }
    void actions.syncCustomers(user.agentCode, user.bankCode);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setHasAttemptedInitialLoad(true);
    loadCustomers();
  }, [loadCustomers, user]);

  const handleCustomerPress = useCallback(
    (customer: Customer) => {
      const gracePeriod = evaluateGracePeriod(
        user?.lastDepositDate,
        user?.graceDays,
      );

      if (!gracePeriod.allowed) {
        showSnackbar(GRACE_PERIOD_EXCEEDED_MESSAGE, {
          type: 'error',
          duration: 6000,
        });
        return;
      }

      router.push({
        pathname: '/userDetail',
        params: {
          id: customer.userId.toString(),
          agentCode: customer.agentCode.toString(),
          bankCode: customer.bankCode,
          name: customer.customerName.trim(),
          balance: customer.currentBalance.toString(),
          account: customer.accountNumber.toString(),
          mobilenumber: customer.mobilenumber,
        },
      });
    },
    [router, user?.graceDays, user?.lastDepositDate],
  );

  const handleSearchChange = useCallback((text: string) => {
    voiceSearch.cancel();
    setSearchText(text);
  }, [voiceSearch]);

  const renderCustomer: ListRenderItem<Customer> = useCallback(
    ({ item }) => (
      <CustomerListItem customer={item} onPress={handleCustomerPress} />
    ),
    [handleCustomerPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder='Search customers'
          onChangeText={handleSearchChange}
          value={searchText}
          style={styles.searchbar}
          icon='magnify'
          iconColor='#4A90E2'
          inputStyle={styles.searchInput}
          right={(props) => (
            <IconButton
              {...props}
              icon={voiceSearch.isActive ? 'microphone-off' : 'microphone'}
              iconColor={voiceSearch.isActive ? '#D32F2F' : '#4A90E2'}
              onPress={voiceSearch.start}
              accessibilityLabel={
                voiceSearch.isActive ? 'Cancel voice search' : 'Start voice search'
              }
            />
          )}
        />
      </View>

      <FlatList
        data={customers}
        renderItem={renderCustomer}
        keyExtractor={(customer) => customer.accountNumber.toString()}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={32}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={loadCustomers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {!hasAttemptedInitialLoad || syncing ? (
              <>
                <ActivityIndicator size='large' color='#4A90E2' />
                <Text variant='bodyLarge' style={styles.loadingText}>
                  Loading customers...
                </Text>
              </>
            ) : (
              <Text variant='bodyLarge' style={styles.emptyText}>
                No customers found
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchbar: {
    backgroundColor: '#fff',
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
    color: '#4A90E2',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
  },
});
