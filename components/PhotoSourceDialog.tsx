/**
 * Dialog offering to take a new photo or pick one from the gallery for a
 * customer. Suppresses the PIN auto-lock for the whole camera/gallery round
 * trip (`beginTrustedHandoff`/`endTrustedHandoff`) since handing control to
 * a system picker can take longer than the app's normal grace window.
 */
import { useAuth } from '@/providers/AuthProvider';
import { showSnackbar } from '@/utils/snackbar';
import * as ImagePicker from 'expo-image-picker';
import { Button, Dialog, List, Portal } from 'react-native-paper';

type PhotoSourceDialogProps = {
  visible: boolean;
  hasExistingPhoto: boolean;
  onDismiss: () => void;
  onPicked: (uri: string) => void;
};

export function PhotoSourceDialog({
  visible,
  hasExistingPhoto,
  onDismiss,
  onPicked,
}: PhotoSourceDialogProps) {
  const { beginTrustedHandoff, endTrustedHandoff } = useAuth();

  const pickFromCamera = async () => {
    // The camera (and the permission prompt before it) hands control to a
    // system UI for an unbounded amount of time — suppress the PIN auto-lock
    // for the whole round trip, not just the fixed grace window it normally
    // gets, or finishing a shot could bounce the agent straight to the lock
    // screen and drop the in-flight upload.
    beginTrustedHandoff();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onDismiss();
        showSnackbar('Camera permission is required to take a photo.', {
          type: 'error',
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) {
        onDismiss();
        return;
      }
      onPicked(result.assets[0].uri);
    } catch {
      onDismiss();
      showSnackbar('Unable to open the camera.', { type: 'error' });
    } finally {
      endTrustedHandoff();
    }
  };

  const pickFromLibrary = async () => {
    beginTrustedHandoff();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onDismiss();
        showSnackbar('Photo library permission is required.', {
          type: 'error',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) {
        onDismiss();
        return;
      }
      onPicked(result.assets[0].uri);
    } catch {
      onDismiss();
      showSnackbar('Unable to open the photo library.', { type: 'error' });
    } finally {
      endTrustedHandoff();
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>
          {hasExistingPhoto ? 'Change customer photo' : 'Add customer photo'}
        </Dialog.Title>
        <Dialog.Content>
          <List.Item
            title='Take Photo'
            left={(props) => <List.Icon {...props} icon='camera' />}
            onPress={() => void pickFromCamera()}
          />
          <List.Item
            title='Choose from Library'
            left={(props) => <List.Icon {...props} icon='image-multiple' />}
            onPress={() => void pickFromLibrary()}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
