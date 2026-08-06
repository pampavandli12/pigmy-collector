import { PinScreenLayout } from '@/components/PinScreenLayout';
import { useAuth } from '@/providers/AuthProvider';
import { showSnackbar } from '@/utils/snackbar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const normalizePin = (value: string) => value.replace(/\D/g, '').slice(0, 6);

export default function PinUnlock() {
  const { unlockWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter your six-digit PIN.');
      return;
    }

    setChecking(true);
    setError('');
    try {
      const unlocked = await unlockWithPin(pin);
      if (!unlocked) {
        setPin('');
        setError('Incorrect PIN. Please try again.');
      }
    } catch {
      showSnackbar('Unable to verify your PIN. Please try again.', {
        type: 'error',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <PinScreenLayout
      title='Enter App PIN'
      description='Enter your six-digit PIN to continue.'
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
        testID='pin-unlock-input'
        onSubmitEditing={handleUnlock}
      />
      <Text variant='bodySmall' style={styles.error}>
        {error}
      </Text>
      <Button
        mode='contained'
        onPress={handleUnlock}
        loading={checking}
        disabled={checking || pin.length !== 6}
        style={styles.button}
      >
        Unlock
      </Button>
    </PinScreenLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
  },
  error: {
    color: '#B00020',
    marginTop: 8,
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
