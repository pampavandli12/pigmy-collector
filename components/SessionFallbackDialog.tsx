import { useAuth } from '@/providers/AuthProvider';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export function SessionFallbackDialog() {
  const { dismissSessionNotice, sessionNotice } = useAuth();
  if (!sessionNotice) return null;

  const action = sessionNotice.replacementAgentName
    ? ` Switched to ${sessionNotice.replacementAgentName}.`
    : ' Log in to continue.';
  const reason =
    sessionNotice.reason === 'expired'
      ? 'session has expired.'
      : 'account has been logged out.';

  return (
    <Portal>
      <Dialog visible dismissable={false}>
        <Dialog.Title>Agent account changed</Dialog.Title>
        <Dialog.Content>
          <Text variant='bodyLarge'>
            {sessionNotice.expiredAgentName}&apos;s {reason}
            {action}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={dismissSessionNotice}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
