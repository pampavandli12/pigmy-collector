import { PinScreenLayout } from '@/components/PinScreenLayout';
import { useAuth } from '@/providers/AuthProvider';
import { showSnackbar } from '@/utils/snackbar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const normalizePin = (value: string) => value.replace(/\D/g, '').slice(0, 6);

export default function PinSetup() {
  const { setupPin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSetup = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter a six-digit PIN.');
      return;
    }
    if (pin !== confirmation) {
      setError('PINs do not match.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await setupPin(pin);
    } catch {
      showSnackbar('Unable to save your PIN. Please try again.', {
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PinScreenLayout
      title='Create App PIN'
      description='Set a six-digit PIN to protect access to the app on this device.'
    >
      <TextInput
        label='6-digit PIN'
        value={pin}
        onChangeText={(value) => {
          setPin(normalizePin(value));
          setError('');
        }}
        keyboardType='number-pad'
        secureTextEntry
        maxLength={6}
        autoFocus
        style={styles.input}
        testID='pin-setup-input'
      />
      <TextInput
        label='Confirm PIN'
        value={confirmation}
        onChangeText={(value) => {
          setConfirmation(normalizePin(value));
          setError('');
        }}
        keyboardType='number-pad'
        secureTextEntry
        maxLength={6}
        style={styles.input}
        testID='pin-confirm-input'
      />
      <Text variant='bodySmall' style={styles.error}>
        {error}
      </Text>
      <Button
        mode='contained'
        onPress={handleSetup}
        loading={saving}
        disabled={saving || pin.length !== 6 || confirmation.length !== 6}
        style={styles.button}
      >
        Save PIN
      </Button>
    </PinScreenLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  error: {
    color: '#B00020',
    minHeight: 20,
    textAlign: 'center',
  },
  button: {
    borderRadius: 25,
    height: 56,
    justifyContent: 'center',
    marginTop: 12,
  },
});
