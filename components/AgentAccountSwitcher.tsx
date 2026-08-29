import { useAuth } from '@/providers/AuthProvider';
import { getAgentAccountId } from '@/services/authStorage';
import { userLogin } from '@/services/login';
import { showSnackbar } from '@/utils/snackbar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';

export function AgentAccountSwitcher() {
  const { accounts, login, reauthenticateAccount, switchAccount, user } = useAuth();
  const [accountsVisible, setAccountsVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [reauthAccountId, setReauthAccountId] = useState<string | null>(null);

  const activeId = user ? getAgentAccountId(user) : null;

  const handleSwitch = async (accountId: string) => {
    const account = accounts.find((item) => item.accountId === accountId);
    if (account?.status === 'loginRequired') {
      setReauthAccountId(accountId);
      setPhoneNumber(account.phoneNumber);
      setPassword('');
      setAddVisible(true);
      return;
    }
    if (accountId === activeId) {
      setAccountsVisible(false);
      return;
    }

    setLoading(true);
    try {
      await switchAccount(accountId);
      setAccountsVisible(false);
      showSnackbar('Agent account switched successfully.', { type: 'success' });
    } catch {
      showSnackbar('Unable to switch agent account.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!/^[6-9]\d{9}$/.test(phoneNumber.trim()) || password.length < 6) {
      showSnackbar('Enter a valid phone number and password.', { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const account = await userLogin(phoneNumber.trim(), password);
      if (reauthAccountId) {
        await reauthenticateAccount(reauthAccountId, account);
      } else {
        await login(account);
      }
      setPhoneNumber('');
      setPassword('');
      setAddVisible(false);
      setAccountsVisible(false);
      setReauthAccountId(null);
      showSnackbar(
        reauthAccountId
          ? 'Agent account restored and activated.'
          : 'Agent account added and activated.',
        { type: 'success' },
      );
    } catch (error) {
      showSnackbar(
        error instanceof Error && error.message.includes('different agent')
          ? error.message
          : 'Login failed. Please check the agent credentials.', {
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Button
        mode='outlined'
        icon='account-switch'
        onPress={() => setAccountsVisible(true)}
        style={styles.trigger}
        contentStyle={styles.triggerContent}
      >
        {user.agentName}
      </Button>

      <Portal>
        <Dialog visible={accountsVisible} onDismiss={() => setAccountsVisible(false)}>
          <Dialog.Title>Agent accounts</Dialog.Title>
          <Dialog.Content>
            <Text variant='bodyMedium' style={styles.description}>
              Customers and local transactions are kept separately for each agent.
            </Text>
            {(accounts ?? []).map((account, index) => {
              const accountId = account.accountId;
              return (
                <View key={accountId}>
                  {index > 0 && <Divider />}
                  <List.Item
                    title={account.agentName}
                    description={
                      account.status === 'loginRequired'
                        ? `${account.bankName} · Login required`
                        : `${account.bankName} · ${account.phoneNumber}`
                    }
                    onPress={() => void handleSwitch(accountId)}
                    disabled={loading}
                    left={() => (
                      <Avatar.Text
                        size={42}
                        label={account.agentName.charAt(0).toUpperCase()}
                      />
                    )}
                    right={(props) =>
                      account.status === 'loginRequired' ? (
                        <List.Icon {...props} icon='lock-alert' color='#C62828' />
                      ) : accountId === activeId ? (
                        <List.Icon {...props} icon='check-circle' color='#2E7D32' />
                      ) : (
                        <List.Icon {...props} icon='chevron-right' />
                      )
                    }
                  />
                </View>
              );
            })}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAccountsVisible(false)}>Close</Button>
            <Button
              icon='account-plus'
              onPress={() => {
                setReauthAccountId(null);
                setPhoneNumber('');
                setPassword('');
                setAddVisible(true);
              }}
              disabled={loading}
            >
              Add account
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={addVisible} onDismiss={() => setAddVisible(false)}>
          <Dialog.Title>
            {reauthAccountId ? 'Log in to agent account' : 'Add agent account'}
          </Dialog.Title>
          <Dialog.Content style={styles.form}>
            <TextInput
              label='Phone number'
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType='phone-pad'
              autoCapitalize='none'
              disabled={loading || Boolean(reauthAccountId)}
            />
            <TextInput
              label='Password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              disabled={loading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setAddVisible(false);
                setReauthAccountId(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onPress={() => void handleAdd()} loading={loading} disabled={loading}>
              {reauthAccountId ? 'Log in and switch' : 'Add and switch'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { marginTop: 16, borderRadius: 12, alignSelf: 'flex-start' },
  triggerContent: { minHeight: 44 },
  description: { color: '#666', marginBottom: 8 },
  form: { gap: 12 },
});
