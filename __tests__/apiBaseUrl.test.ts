import { resolveApiBaseUrl } from '../utils/constants';

test('uses the emulator host in debug when no API URL is configured', () => {
  expect(
    resolveApiBaseUrl({
      configured: undefined,
      isDev: true,
      platformOs: 'android',
    }),
  ).toBe('http://10.0.2.2:1010');
});

test('uses a configured URL in debug builds', () => {
  expect(
    resolveApiBaseUrl({
      configured: ' http://10.0.2.2:1010 ',
      isDev: true,
      platformOs: 'android',
    }),
  ).toBe('http://10.0.2.2:1010');
});

test('requires an https API URL in production builds', () => {
  expect(
    resolveApiBaseUrl({
      configured: 'https://api.example.com',
      isDev: false,
      platformOs: 'android',
    }),
  ).toBe('https://api.example.com');

  expect(() =>
    resolveApiBaseUrl({
      configured: undefined,
      isDev: false,
      platformOs: 'android',
    }),
  ).toThrow('EXPO_PUBLIC_API_BASE_URL must be an https URL');

  expect(() =>
    resolveApiBaseUrl({
      configured: 'http://10.0.2.2:1010',
      isDev: false,
      platformOs: 'android',
    }),
  ).toThrow('EXPO_PUBLIC_API_BASE_URL must be an https URL');
});
