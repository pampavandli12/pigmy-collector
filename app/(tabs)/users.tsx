import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Customer {
  id: string;
  name: string;
  balance: number;
  account: string;
  image: string;
  status: "all" | "active";
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "1",
    name: "Sophia Clark",
    balance: 5000.0,
    account: "7890",
    image: "https://i.pravatar.cc/150?img=1",
    status: "active",
  },
  {
    id: "2",
    name: "Ethan Bennett",
    balance: 2500.0,
    account: "3210",
    image: "https://i.pravatar.cc/150?img=13",
    status: "active",
  },
  {
    id: "3",
    name: "Olivia Harper",
    balance: 7500.0,
    account: "0123",
    image: "https://i.pravatar.cc/150?img=5",
    status: "active",
  },
  {
    id: "4",
    name: "Liam Foster",
    balance: 1200.0,
    account: "3456",
    image: "https://i.pravatar.cc/150?img=12",
    status: "all",
  },
  {
    id: "5",
    name: "Ava Morgan",
    balance: 3800.0,
    account: "8901",
    image: "https://i.pravatar.cc/150?img=9",
    status: "active",
  },
];

export default function Users() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [customers] = useState<Customer[]>(MOCK_CUSTOMERS);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || customer.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: "/userDetail",
      params: {
        id: customer.id,
        name: customer.name,
        balance: customer.balance.toString(),
        account: customer.account,
        image: customer.image,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search customers"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
          iconColor="#4A90E2"
          inputStyle={styles.searchInput}
        />

        <View style={styles.filterContainer}>
          <Button
            mode={filter === "all" ? "contained" : "outlined"}
            onPress={() => setFilter("all")}
            style={[
              styles.filterButton,
              filter === "all" && styles.filterButtonActive,
            ]}
            labelStyle={[
              styles.filterButtonLabel,
              filter === "all" && styles.filterButtonLabelActive,
            ]}
            contentStyle={styles.filterButtonContent}
          >
            All
          </Button>
          <Button
            mode={filter === "active" ? "contained" : "outlined"}
            onPress={() => setFilter("active")}
            style={[
              styles.filterButton,
              filter === "active" && styles.filterButtonActive,
            ]}
            labelStyle={[
              styles.filterButtonLabel,
              filter === "active" && styles.filterButtonLabelActive,
            ]}
            contentStyle={styles.filterButtonContent}
          >
            Active
          </Button>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredCustomers.map((customer) => (
          <Card
            key={customer.id}
            style={styles.customerCard}
            onPress={() => handleCustomerPress(customer)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.customerInfo}>
                <Image source={{ uri: customer.image }} style={styles.avatar} />
                <View style={styles.customerDetails}>
                  <Text variant="titleMedium" style={styles.customerName}>
                    {customer.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.balance}>
                    Balance: ${customer.balance.toFixed(2)}
                  </Text>
                  <Text variant="bodyMedium" style={styles.account}>
                    Acct: ****{customer.account}
                  </Text>
                </View>
              </View>
              <IconButton
                icon="chevron-right"
                size={24}
                iconColor="#4A90E2"
                style={styles.chevron}
              />
            </Card.Content>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No customers found
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
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchbar: {
    backgroundColor: "#fff",
    elevation: 0,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
    color: "#4A90E2",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  filterButton: {
    borderRadius: 20,
    borderColor: "#E0E0E0",
    backgroundColor: "transparent",
  },
  filterButtonActive: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  filterButtonContent: {
    paddingHorizontal: 12,
    height: 36,
  },
  filterButtonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginHorizontal: 8,
  },
  filterButtonLabelActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  customerCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  balance: {
    color: "#4A90E2",
    fontSize: 14,
    marginBottom: 2,
  },
  account: {
    color: "#4A90E2",
    fontSize: 14,
  },
  chevron: {
    margin: 0,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#999",
  },
});
