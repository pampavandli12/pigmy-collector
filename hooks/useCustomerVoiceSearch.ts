import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { requestMicrophonePermission } from '@/services/microphonePermission';
import { store$ } from '@/store/store';
import { showSnackbar } from '@/utils/snackbar';

export function useCustomerVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useSpeechRecognitionEvent('start', () => {
    setIsStarting(false);
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsStarting(false);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();

    if (transcript) {
      store$.searchQuery.set(transcript);
    }
  });

  useSpeechRecognitionEvent('nomatch', () => {
    showSnackbar('No matching speech was recognized.', { type: 'info' });
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsStarting(false);
    setIsListening(false);

    if (event.error === 'aborted') {
      return;
    }

    const message =
      event.error === 'no-speech' || event.error === 'speech-timeout'
        ? 'No speech was detected. Please try again.'
        : event.error === 'network'
          ? 'Speech recognition needs a network connection on this device.'
          : event.error === 'not-allowed'
            ? 'Microphone permission is required for voice search.'
            : 'Voice search is unavailable. Please try again.';

    showSnackbar(message, { type: 'error' });
  });

  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  const start = async () => {
    if (isStarting || isListening) {
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    setIsStarting(true);

    try {
      const permission =
        Platform.OS === 'android'
          ? await requestMicrophonePermission()
          : await ExpoSpeechRecognitionModule.requestPermissionsAsync().then(
              (result) =>
                result.granted
                  ? 'granted'
                  : result.canAskAgain
                    ? 'denied'
                    : 'blocked',
            );

      if (permission === 'blocked') {
        setIsStarting(false);
        showSnackbar('Enable microphone access in system settings.', {
          type: 'error',
          action: {
            label: 'Settings',
            onPress: () => Linking.openSettings(),
          },
        });
        return;
      }

      if (permission !== 'granted') {
        setIsStarting(false);
        showSnackbar('Microphone permission is required for voice search.', {
          type: 'error',
        });
        return;
      }

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setIsStarting(false);
        showSnackbar('Speech recognition is not available on this device.', {
          type: 'error',
        });
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-IN',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch {
      setIsStarting(false);
      showSnackbar('Unable to start voice search.', { type: 'error' });
    }
  };

  const cancel = () => {
    if (isStarting || isListening) {
      ExpoSpeechRecognitionModule.abort();
      setIsStarting(false);
      setIsListening(false);
    }
  };

  return {
    isActive: isStarting || isListening,
    start,
    cancel,
  };
}
