import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Transaction {
  id: string;
  name: string;
  date: string;
  time: string;
  amount: number;
  status: string;
  avatar: string;
}

export default function Dashboard() {
  const [transactions] = useState<Transaction[]>([
    {
      id: "1",
      name: "Ethan Carter",
      date: "05/15/24",
      time: "10:42 AM",
      amount: 500.0,
      status: "Success",
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
      id: "2",
      name: "Olivia Bennett",
      date: "05/14/24",
      time: "04:15 PM",
      amount: 1200.0,
      status: "Success",
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: "3",
      name: "Noah Thompson",
      date: "05/13/24",
      time: "09:30 AM",
      amount: 800.0,
      status: "Success",
      avatar: "https://i.pravatar.cc/150?img=13",
    },
    {
      id: "4",
      name: "Ava Martinez",
      date: "05/12/24",
      time: "02:20 PM",
      amount: 2000.0,
      status: "Success",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
    {
      id: "5",
      name: "Liam Harris",
      date: "05/11/24",
      time: "11:15 AM",
      amount: 1500.0,
      status: "Success",
      avatar: "https://i.pravatar.cc/150?img=15",
    },
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Collection Card */}
        <Card style={styles.collectionCard}>
          <Card.Content>
            <View style={styles.collectionHeader}>
              <Icon source="wallet" size={24} color="#fff" />
              <Text variant="titleMedium" style={styles.collectionLabel}>
                Today's Collection
              </Text>
            </View>
            <Text variant="displaySmall" style={styles.collectionAmount}>
              $12,500
            </Text>
            <View style={styles.percentageBadge}>
              <Icon source="trending-up" size={16} color="#fff" />
              <Text variant="bodySmall" style={styles.percentageText}>
                +12%
              </Text>
              <Text variant="bodySmall" style={styles.percentageSubtext}>
                from yesterday
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainer}>
                <Icon source="calendar-clock" size={28} color="#FF9800" />
              </View>
              <Text variant="headlineMedium" style={styles.statValue}>
                $4,200
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Total Due Payments
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statIconContainerGreen}>
                <Icon source="check-circle" size={28} color="#4CAF50" />
              </View>
              <Text variant="headlineMedium" style={styles.statValue}>
                142
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Completed Trans.
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Button
            mode="text"
            icon="plus-circle"
            textColor="#4A90E2"
            labelStyle={styles.actionButtonLabel}
            contentStyle={styles.actionButtonContent}
            onPress={() => console.log("Add Deposit")}
          >
            Add Deposit
          </Button>
          <Button
            mode="text"
            icon="account-plus"
            textColor="#4A90E2"
            labelStyle={styles.actionButtonLabel}
            contentStyle={styles.actionButtonContent}
            onPress={() => console.log("Add Customer")}
          >
            Add Customer
          </Button>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsHeader}>
          <Text variant="titleLarge" style={styles.transactionsTitle}>
            Recent Transactions
          </Text>
          <Text variant="bodyMedium" style={styles.viewAllLink}>
            View All
          </Text>
        </View>

        {/* Transaction List */}
        <View style={styles.transactionsList}>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <Image
                source={{ uri: transaction.avatar }}
                style={styles.transactionAvatar}
              />
              <View style={styles.transactionInfo}>
                <Text variant="titleMedium" style={styles.transactionName}>
                  {transaction.name}
                </Text>
                <Text variant="bodySmall" style={styles.transactionDate}>
                  {transaction.date} • {transaction.time}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text variant="titleMedium" style={styles.transactionAmount}>
                  +${transaction.amount.toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={styles.transactionStatus}>
                  {transaction.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
  },
  headerTitle: {
    fontWeight: "700",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  collectionCard: {
    backgroundColor: "#4A90E2",
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  collectionLabel: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "500",
  },
  collectionAmount: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
  },
  percentageBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  percentageText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
  percentageSubtext: {
    color: "#fff",
    marginLeft: 8,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statIconContainerGreen: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  statLabel: {
    color: "#666",
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  actionButtonContent: {
    flexDirection: "row-reverse",
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  transactionsTitle: {
    fontWeight: "700",
    color: "#000",
  },
  viewAllLink: {
    color: "#4A90E2",
    fontWeight: "600",
  },
  transactionsList: {
    gap: 12,
    marginBottom: 24,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  transactionDate: {
    color: "#666",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontWeight: "700",
    color: "#4A90E2",
    marginBottom: 4,
  },
  transactionStatus: {
    color: "#4CAF50",
    fontWeight: "500",
  },
});
