import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type PinScreenLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PinScreenLayout({
  title,
  description,
  children,
}: PinScreenLayoutProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant='headlineLarge' style={styles.title}>
          {title}
        </Text>
        <Text variant='bodyLarge' style={styles.description}>
          {description}
        </Text>
        <View style={styles.form}>{children}</View>
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
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#000',
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  form: {
    marginTop: 36,
  },
});
