import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, IconButton, Searchbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';

import { store$ } from '@/store/store';

import { filteredCustomers$ } from '@/store/selectors';

import { actions } from '@/store/actions';
import { Customer } from '@/types/user';

export default function Users() {
  const customers = filteredCustomers$.get();
  const searchQuery = store$.searchQuery.get();

  const syncing = store$.isRefreshingCustomers.get();

  const router = useRouter();

  const { user } = useAuth();

  const onRefresh = useCallback(() => {
    loadCustomers();
  }, []);

  const loadCustomers = useCallback(() => {
    if (!user) {
      return;
    }
    actions.syncCustomers(user.agentCode, user.bankCode);
  }, [user]);

  const handleCustomerPress = (customer: Customer) => {
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Searchbar
          placeholder='Search customers'
          onChangeText={(text) => store$.searchQuery.set(text)}
          value={searchQuery}
          style={styles.searchbar}
          icon='magnify'
          iconColor='#4A90E2'
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={onRefresh} />
        }
      >
        {customers?.map((customer) => (
          <Card
            key={customer.accountNumber.toString()}
            style={styles.customerCard}
            onPress={() => handleCustomerPress(customer)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.customerInfo}>
                <Avatar.Text
                  size={45}
                  label={
                    customer.customerName?.trim()?.charAt(0)?.toUpperCase() ||
                    'U'
                  }
                  style={styles.avatar}
                />

                <View style={styles.customerDetails}>
                  <Text
                    variant='titleMedium'
                    style={styles.customerName}
                    numberOfLines={1}
                  >
                    {customer.customerName?.trim() || 'Unknown Customer'}
                  </Text>

                  <Text variant='bodyMedium' style={styles.balance}>
                    Balance: ₹{Number(customer.currentBalance || 0).toFixed(2)}
                  </Text>

                  <Text variant='bodyMedium' style={styles.account}>
                    Acct: {customer.accountNumber}
                  </Text>
                </View>
              </View>

              <IconButton
                icon='chevron-right'
                size={24}
                iconColor='#4A90E2'
                style={styles.chevron}
              />
            </Card.Content>
          </Card>
        ))}

        {customers.length === 0 && !isCustomerLoading && (
          <View style={styles.emptyState}>
            <Text variant='bodyLarge' style={styles.emptyText}>
              No customers found
            </Text>
          </View>
        )}
        {/* {isCustomerLoading && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Loading customers...
            </Text>
          </View>
        )} */}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  customerCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  balance: {
    color: '#4A90E2',
    fontSize: 14,
    marginBottom: 2,
  },
  account: {
    color: '#4A90E2',
    fontSize: 14,
  },
  chevron: {
    margin: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
  },
});
