import { useAuth } from '@/app/providers/AuthProvider';
import { userLogin } from '@/services/login';
import { showSnackbar } from '@/utils/snackbar';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

const loginSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function SignIn() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
    mode: 'onChange',
  });

  const handleSignIn = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const user = await userLogin(values.phoneNumber, values.password);
      await login(user);
    } catch (error) {
      showSnackbar(
        'Login failed. Please check your credentials and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant='headlineLarge' style={styles.title}>
          Agent Login
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name='phoneNumber'
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  placeholder='Phone Number'
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  mode='flat'
                  style={styles.input}
                  autoCapitalize='none'
                  keyboardType='phone-pad'
                  left={<TextInput.Icon icon='phone' />}
                  underlineStyle={{ height: 0 }}
                  contentStyle={styles.inputContent}
                  error={Boolean(errors.phoneNumber)}
                />
              )}
            />
            <Text variant='bodySmall' style={styles.errorText}>
              {errors.phoneNumber?.message}
            </Text>
          </View>

          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name='password'
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  placeholder='Password'
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  mode='flat'
                  secureTextEntry={isPasswordHidden}
                  style={styles.input}
                  left={<TextInput.Icon icon='lock-outline' />}
                  underlineStyle={{ height: 0 }}
                  contentStyle={styles.inputContent}
                  right={
                    <TextInput.Icon
                      icon={isPasswordHidden ? 'eye-off' : 'eye'}
                      onPress={() => setIsPasswordHidden(!isPasswordHidden)}
                    />
                  }
                  error={Boolean(errors.password)}
                />
              )}
            />
            <Text variant='bodySmall' style={styles.errorText}>
              {errors.password?.message}
            </Text>
          </View>

          <Button
            mode='contained'
            onPress={handleSubmit(handleSignIn)}
            loading={loading}
            disabled={loading || !isValid}
            style={styles.loginButton}
            labelStyle={styles.loginButtonText}
          >
            Login
          </Button>
        </View>

        <Text variant='bodySmall' style={styles.footer}>
          © 2024 Bank Co. All rights reserved.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEFEF',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#000',
    marginBottom: 60,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#D9D9D9',
    borderRadius: 8,
    height: 60,
  },
  inputContent: {
    paddingLeft: 8,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 25,
    height: 56,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  otpButton: {
    borderRadius: 25,
    height: 56,
    backgroundColor: '#D6E9F8',
    borderColor: '#D6E9F8',
    justifyContent: 'center',
  },
  otpButtonContent: {
    height: 56,
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
  },
  errorText: {
    color: '#B00020',
    minHeight: 20,
    paddingTop: 4,
  },
});
