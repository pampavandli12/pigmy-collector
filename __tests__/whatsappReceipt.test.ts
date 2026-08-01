jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    shareSingle: jest.fn(),
    isPackageInstalled: jest.fn(),
  },
  Social: {
    Whatsapp: 'whatsapp',
    Whatsappbusiness: 'whatsappbusiness',
  },
}));
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(),
}));

import {
  hasUsablePhoneNumber,
  isShareCancellationError,
  normalizeWhatsAppNumber,
} from '../utils/whatsappReceipt';

test.each([
  ['9123456780', '919123456780'],
  ['+91 91234-56780', '919123456780'],
  ['00 44 7700 900123', '447700900123'],
  ['1 (415) 555-2671', '14155552671'],
])('normalizes %s for WhatsApp', (input, expected) => {
  expect(normalizeWhatsAppNumber(input)).toBe(expected);
});

test.each(['', '12345', 'not-a-number', undefined, null])(
  'rejects unusable phone value %s',
  (input) => {
    expect(normalizeWhatsAppNumber(input)).toBeNull();
    expect(hasUsablePhoneNumber(input)).toBe(false);
  },
);

test('recognizes a dismissed share without treating other failures as cancellation', () => {
  expect(isShareCancellationError(new Error('User did cancel'))).toBe(true);
  expect(isShareCancellationError(new Error('WhatsApp not installed'))).toBe(
    false,
  );
});
