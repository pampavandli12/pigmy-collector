import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PhotoPreviewModalProps = {
  visible: boolean;
  photoUri: string | null;
  onDismiss: () => void;
};

export function PhotoPreviewModal({
  visible,
  photoUri,
  onDismiss,
}: PhotoPreviewModalProps) {
  const insets = useSafeAreaInsets();

  if (!photoUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Image
          source={{ uri: photoUri }}
          style={styles.image}
          contentFit='contain'
        />
      </Pressable>
      <IconButton
        icon='close'
        size={28}
        iconColor='#fff'
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={onDismiss}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  image: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
  },
});
