import { PermissionsAndroid, Platform } from 'react-native';

export type MicrophonePermissionResult =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported';

export async function requestMicrophonePermission(): Promise<MicrophonePermissionResult> {
  if (Platform.OS !== 'android') {
    return 'unsupported';
  }

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;

  if (await PermissionsAndroid.check(permission)) {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Microphone permission',
    message: 'Pigmy Collector needs microphone access for voice search.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }

  return 'denied';
}
