import { Status } from '@/types/sharedEnums';
import { Customer } from '@/types/user';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Card,
  IconButton,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import useUser from '../store/userStore';

export default function Users() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active'>('all');
  const customerLoading = useUser((state) => state.loadCustomerStatus);
  const fetchCustomers = useUser((state) => state.loadCustomers);
  const customers = useUser((state) => state.customers);
  const { user } = useAuth();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers().finally(() => setRefreshing(false));
  }, []);

  const loadCustomers = useCallback(async () => {
    if (!user) {
      return;
    }

    await fetchCustomers({
      agentCode: user.agentCode,
      bankCode: user.bankCode,
    });
  }, [user]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.customerName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || filter === 'active';
    return matchesSearch && matchesFilter;
  });

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
      },
    });
  };
  const isCustomerLoading = useMemo(() => {
    return customerLoading === Status.Loading;
  }, [customerLoading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Searchbar
          placeholder='Search customers'
          onChangeText={setSearchQuery}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCustomers &&
          filteredCustomers.map((customer) => (
            <Card
              key={customer.userId}
              style={styles.customerCard}
              onPress={() => handleCustomerPress(customer)}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.customerInfo}>
                  <Avatar.Text
                    size={45}
                    label={customer.customerName.charAt(0).toUpperCase()}
                    style={styles.avatar}
                  />

                  <View style={styles.customerDetails}>
                    <Text variant='titleMedium' style={styles.customerName}>
                      {customer.customerName.trim()}
                    </Text>
                    <Text variant='bodyMedium' style={styles.balance}>
                      Balance: ₹{customer.currentBalance.toFixed(2)}
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

        {filteredCustomers.length === 0 && !isCustomerLoading && (
          <View style={styles.emptyState}>
            <Text variant='bodyLarge' style={styles.emptyText}>
              No customers found
            </Text>
          </View>
        )}
        {isCustomerLoading && (
          <View style={styles.emptyState}>
            <Text variant='bodyLarge' style={styles.emptyText}>
              Loading customers...
            </Text>
          </View>
        )}
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
