import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere below it so a single unexpected throw
 * degrades to a recoverable screen instead of white-screening the whole app
 * mid-session. "Try again" clears the error and re-renders the subtree.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text variant='headlineSmall' style={styles.title}>
          Something went wrong
        </Text>
        <Text variant='bodyMedium' style={styles.message}>
          The app hit an unexpected error. Your saved deposits are safe. Please
          try again.
        </Text>
        <Button mode='contained' onPress={this.handleReset}>
          Try again
        </Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontWeight: '700',
    color: '#1A2233',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: '#5A6472',
    textAlign: 'center',
    marginBottom: 24,
  },
});
