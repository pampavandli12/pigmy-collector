jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    abort: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    isRecognitionAvailable: jest.fn(),
    start: jest.fn(),
  },
  useSpeechRecognitionEvent: (name: string, handler: (event?: any) => void) => {
    (globalThis as any).__speechHandlers[name] = handler;
  },
}));
jest.mock('../services/microphonePermission', () => ({
  requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
}));
jest.mock('../utils/snackbar', () => ({ showSnackbar: jest.fn() }));

import { act, renderHook } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';
import { useCustomerVoiceSearch } from '../hooks/useCustomerVoiceSearch';
import { store$ } from '../store/store';
import { showSnackbar } from '../utils/snackbar';

beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  (globalThis as any).__speechHandlers = {};
  jest.clearAllMocks();
  (ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock).mockReturnValue(true);
  store$.searchQuery.set('');
});

test('starts available speech recognition after permission', async () => {
  const { result } = renderHook(() => useCustomerVoiceSearch());
  await act(async () => result.current.start());
  expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'en-IN' }));
});

test('stores recognized customer text', () => {
  renderHook(() => useCustomerVoiceSearch());
  act(() => (globalThis as any).__speechHandlers.result({ results: [{ transcript: '  Customer  ' }] }));
  expect(store$.searchQuery.peek()).toBe('Customer');
});

test('shows useful recognition errors', () => {
  renderHook(() => useCustomerVoiceSearch());
  act(() => (globalThis as any).__speechHandlers.error({ error: 'network' }));
  expect(showSnackbar).toHaveBeenCalledWith(
    'Speech recognition needs a network connection on this device.',
    { type: 'error' },
  );
});
