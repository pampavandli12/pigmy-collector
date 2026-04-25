import { LocalTransaction } from '@/types/user';
import {
  fetchLocalTransactions,
  fetchTodaysTransactionAmount,
} from '@/utils/transactions';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [todaysTotal, setTodaysTotal] = useState(0);

  const loadDashboardData = useCallback(async () => {
    try {
      const recentTransactions = await fetchLocalTransactions();
      setTransactions(recentTransactions);

      const today = await fetchTodaysTransactionAmount();
      setTodaysTotal(today);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Collection Card */}
        <Card style={styles.collectionCard}>
          <Card.Content>
            <View style={styles.collectionHeader}>
              <Icon source='wallet' size={24} color='#fff' />
              <Text variant='titleMedium' style={styles.collectionLabel}>
                Today's Collection
              </Text>
            </View>
            <Text variant='displaySmall' style={styles.collectionAmount}>
              ₹{todaysTotal.toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        {/* Recent Transactions */}
        <View style={styles.transactionsHeader}>
          <Text variant='titleLarge' style={styles.transactionsTitle}>
            Recent Transactions
          </Text>
        </View>

        {/* Transaction List */}
        <View style={styles.transactionsList}>
          {transactions.map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <Avatar.Text
                size={48}
                label={transaction.customerName.charAt(0).toUpperCase()}
                style={styles.transactionAvatar}
              />
              <View style={styles.transactionInfo}>
                <Text variant='titleMedium' style={styles.transactionName}>
                  {transaction.customerName}
                </Text>
                <Text variant='bodySmall' style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text variant='titleMedium' style={styles.transactionAmount}>
                  +{transaction.collectedAmount.toFixed(2)}
                </Text>
                <Text variant='bodySmall' style={styles.transactionStatus}>
                  {transaction.collectiontype}
                </Text>
              </View>
            </View>
          ))}
          {transactions.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text variant='bodyMedium' style={{ color: '#666' }}>
                No transactions yet
              </Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  collectionCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionLabel: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  collectionAmount: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainerGreen: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionButtonContent: {
    flexDirection: 'row-reverse',
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontWeight: '700',
    color: '#000',
  },
  transactionsList: {
    gap: 12,
    marginBottom: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  transactionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
  },
  transactionStatus: {
    color: '#4CAF50',
    fontWeight: '500',
  },
});
