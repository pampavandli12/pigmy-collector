/**
 * A customer's avatar: shows their cached photo if one exists (loaded via
 * `useCustomerPhoto` unless a controlled `photoUri` is passed in), otherwise
 * a first-letter/initials fallback; tapping it offers to view/replace the
 * photo via `PhotoPreviewModal`/`PhotoSourceDialog`.
 */
import { PhotoPreviewModal } from '@/components/PhotoPreviewModal';
import { PhotoSourceDialog } from '@/components/PhotoSourceDialog';
import { useCustomerPhoto } from '@/hooks/useCustomerPhoto';
import { saveCustomerPhoto, type CustomerPhotoKey } from '@/services/customerPhoto';
import { getFirstLetterLabel, getInitialsLabel } from '@/utils/avatarLabel';
import { showSnackbar } from '@/utils/snackbar';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { ActivityIndicator, Avatar, IconButton } from 'react-native-paper';

type CustomerAvatarProps = {
  name: string;
  size?: number;
  labelMode?: 'firstLetter' | 'initials';
  bankCode?: string;
  accountNumber?: number;
  // Controlled photo — when provided (even null), the component never
  // self-fetches and just renders whatever is passed (used by list/dashboard
  // screens that batch-fetch photos once for many rows).
  photoUri?: string | null;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function CustomerAvatar({
  name,
  size = 45,
  labelMode = 'firstLetter',
  bankCode,
  accountNumber,
  photoUri: controlledPhotoUri,
  editable = false,
  style,
  labelStyle,
}: CustomerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const isControlled = controlledPhotoUri !== undefined;
  const photoKey: CustomerPhotoKey | null =
    !isControlled && bankCode && Number.isFinite(accountNumber)
      ? { bankCode, accountNumber: accountNumber as number }
      : null;

  const { photoUri: fetchedPhotoUri, refresh } = useCustomerPhoto(photoKey);
  const resolvedPhotoUri = isControlled ? controlledPhotoUri : fetchedPhotoUri;
  const canEdit = editable && Boolean(bankCode) && Number.isFinite(accountNumber);
  const displayUri = imageFailed ? null : resolvedPhotoUri;

  const label = useMemo(
    () =>
      labelMode === 'initials'
        ? getInitialsLabel(name)
        : getFirstLetterLabel(name),
    [labelMode, name],
  );

  const handlePick = async (sourceUri: string) => {
    if (!bankCode || !Number.isFinite(accountNumber)) return;
    setUploading(true);
    try {
      const saved = await saveCustomerPhoto(
        { bankCode, accountNumber: accountNumber as number },
        sourceUri,
      );
      if (!saved) {
        showSnackbar('Unable to save the photo. Please try again.', {
          type: 'error',
        });
        return;
      }
      setImageFailed(false);
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Pressable
        onPress={() => {
          if (displayUri) setPreviewVisible(true);
        }}
        disabled={!displayUri}
      >
        {displayUri ? (
          <View
            style={[
              styles.imageWrapper,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Image
              source={{ uri: displayUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit='cover'
              onError={() => setImageFailed(true)}
            />
          </View>
        ) : (
          <Avatar.Text size={size} label={label} labelStyle={labelStyle} />
        )}
      </Pressable>

      {uploading && (
        <View style={[styles.loadingOverlay, { borderRadius: size / 2 }]}>
          <ActivityIndicator size='small' color='#fff' />
        </View>
      )}

      {canEdit && !uploading && (
        <IconButton
          icon='camera'
          size={14}
          mode='contained'
          containerColor='#4A90E2'
          iconColor='#fff'
          style={styles.editBadge}
          onPress={() => setPickerVisible(true)}
          accessibilityLabel={displayUri ? 'Change customer photo' : 'Add customer photo'}
        />
      )}

      {canEdit && (
        <PhotoSourceDialog
          visible={pickerVisible}
          hasExistingPhoto={Boolean(displayUri)}
          onDismiss={() => setPickerVisible(false)}
          onPicked={(uri) => {
            setPickerVisible(false);
            void handlePick(uri);
          }}
        />
      )}

      {previewVisible && (
        <PhotoPreviewModal
          visible={previewVisible}
          photoUri={displayUri}
          onDismiss={() => setPreviewVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    margin: 0,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
