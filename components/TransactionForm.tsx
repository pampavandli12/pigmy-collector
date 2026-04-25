import { Picker } from '@react-native-picker/picker';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text, TextInput } from 'react-native-paper';

interface TransactionFormProps {
  customer: {
    id: string;
    name: string;
    agentCode: number;
    bankCode: string;
    balance: number;
    account: string;
    image: string;
  };
  amount: string;
  setAmount: (value: string) => void;
  scheme: string;
  setScheme: (value: string) => void;
  date: string;
  handleConfirm: () => void;
  isTransactionLoading: boolean;
}
export const TransactionForm = ({
  customer,
  amount,
  setAmount,
  scheme,
  setScheme,
  date,
  handleConfirm,
  isTransactionLoading,
}: TransactionFormProps) => {
  const schemeOptions = ['Pigmy Deposit', 'Daily Deposit'];
  return (
    <View style={styles.keyboardView}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info Card */}
        <Card style={styles.customerCard}>
          <Card.Content style={styles.customerContent}>
            <Avatar.Text
              size={45}
              label={customer.name.charAt(0).toUpperCase()}
              style={styles.avatar}
            />
            <View style={styles.customerInfo}>
              <Text variant='titleLarge' style={styles.customerName}>
                {customer.name}
              </Text>
              <Text variant='bodyMedium' style={styles.customerId}>
                ID: {customer.id}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Deposit Details Section */}
        <View style={styles.detailsSection}>
          <Text variant='titleLarge' style={styles.sectionTitle}>
            Deposit Details
          </Text>

          {/* Amount Field */}
          <View style={styles.fieldContainer}>
            <Text variant='bodyMedium' style={styles.fieldLabel}>
              Amount
            </Text>
            <TextInput
              mode='flat'
              value={amount}
              onChangeText={setAmount}
              keyboardType='decimal-pad'
              style={styles.amountInput}
              contentStyle={styles.amountInputContent}
              underlineStyle={{ height: 0 }}
              activeUnderlineColor='transparent'
            />
          </View>

          {/* Scheme Field */}
          <View style={styles.fieldContainer}>
            <Text variant='bodyMedium' style={styles.fieldLabel}>
              Scheme
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={scheme}
                onValueChange={(itemValue) => setScheme(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label='Select scheme' value='' />
                {schemeOptions.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Field */}
          <View style={styles.fieldContainer}>
            <Text variant='titleMedium' style={styles.fieldLabel}>
              Date
            </Text>
            <View style={styles.dateContainer}>
              <Text variant='titleMedium' style={styles.dateValue}>
                {date}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Button
          mode='contained'
          onPress={handleConfirm}
          disabled={!amount || !scheme}
          style={styles.confirmButton}
          loading={isTransactionLoading}
          labelStyle={styles.confirmButtonText}
          contentStyle={styles.confirmButtonContent}
        >
          Confirm + Save
        </Button>
      </View>
    </View>
  );
};

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
  customerCard: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
  },
  customerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  customerId: {
    color: '#999',
  },
  chevron: {
    margin: 0,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 32,
  },
  fieldLabel: {
    color: '#999',
    marginBottom: 8,
    fontSize: 14,
  },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 0,
    height: 60,
  },
  amountInputContent: {
    paddingLeft: 16,
    paddingTop: 8,
  },
  dateContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dateValue: {
    color: '#000',
    fontSize: 16,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 60,
    justifyContent: 'center',
  },
  picker: {
    height: 60,
    color: '#000',
  },
  confirmButton: {
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  confirmButtonContent: {
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
