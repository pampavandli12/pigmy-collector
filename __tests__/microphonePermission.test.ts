import { PermissionsAndroid, Platform } from 'react-native';
import { requestMicrophonePermission } from '../services/microphonePermission';

const originalOS = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalOS });
  jest.restoreAllMocks();
});

test('reports unsupported outside Android', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  await expect(requestMicrophonePermission()).resolves.toBe('unsupported');
});

test('returns granted for an existing Android permission', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
  await expect(requestMicrophonePermission()).resolves.toBe('granted');
});

test.each([
  [PermissionsAndroid.RESULTS.GRANTED, 'granted'],
  [PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN, 'blocked'],
  [PermissionsAndroid.RESULTS.DENIED, 'denied'],
])('maps Android result %s to %s', async (result, expected) => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(result);
  await expect(requestMicrophonePermission()).resolves.toBe(expected);
});
