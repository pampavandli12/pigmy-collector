import { Customer } from '@/types/user';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, IconButton, Text } from 'react-native-paper';

type CustomerListItemProps = {
  customer: Customer;
  onPress: (customer: Customer) => void;
};

function CustomerListItemComponent({
  customer,
  onPress,
}: CustomerListItemProps) {
  const customerName = customer.customerName?.trim() || 'Unknown Customer';

  return (
    <Card style={styles.customerCard} onPress={() => onPress(customer)}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.customerInfo}>
          <Avatar.Text
            size={45}
            label={customerName.charAt(0).toUpperCase() || 'U'}
            style={styles.avatar}
          />

          <View style={styles.customerDetails}>
            <Text
              variant='titleMedium'
              style={styles.customerName}
              numberOfLines={1}
            >
              {customerName}
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
  );
}

export const CustomerListItem = memo(
  CustomerListItemComponent,
  (previous, next) =>
    previous.onPress === next.onPress &&
    previous.customer.accountNumber === next.customer.accountNumber &&
    previous.customer.customerName === next.customer.customerName &&
    previous.customer.currentBalance === next.customer.currentBalance &&
    previous.customer.userId === next.customer.userId &&
    previous.customer.agentCode === next.customer.agentCode &&
    previous.customer.bankCode === next.customer.bankCode &&
    previous.customer.mobilenumber === next.customer.mobilenumber,
);

const styles = StyleSheet.create({
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
});
