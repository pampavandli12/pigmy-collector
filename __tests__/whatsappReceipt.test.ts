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
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import {
  getWhatsAppReceiptErrorMessage,
  hasUsablePhoneNumber,
  isShareCancellationError,
  normalizeWhatsAppNumber,
  shareReceiptToWhatsApp,
} from '../utils/whatsappReceipt';

test.each([
  ['9123456780', '919123456780'],
  ['09123456780', '919123456780'],
  ['+91 91234-56780', '919123456780'],
  ['0091 91234 56780', '919123456780'],
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

test('uses the Android native handoff with a normalized customer number', async () => {
  const originalPlatform = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const mockSharePdfReceipt = jest
    .fn()
    .mockResolvedValueOnce({ packageName: 'com.whatsapp' });
  (requireOptionalNativeModule as jest.Mock).mockImplementation((name) =>
    name === 'ExpoWhatsAppReceipt' ? { sharePdfReceipt: mockSharePdfReceipt } : {},
  );

  try {
    await shareReceiptToWhatsApp({
      pdfUri: 'file:///cache/whatsapp-receipts/receipt.pdf',
      phone: '09123 456780',
      filename: 'receipt.pdf',
      message: 'This caption must not be sent by Android.',
    });
  } finally {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
  }

  expect(mockSharePdfReceipt).toHaveBeenCalledWith(
    'file:///cache/whatsapp-receipts/receipt.pdf',
    '919123456780',
  );
});

test.each([
  ['E_INVALID_PHONE_NUMBER', 'customer phone number is invalid'],
  ['E_RECEIPT_FILE_UNAVAILABLE', 'receipt PDF could not be prepared'],
  ['E_WHATSAPP_UNAVAILABLE', 'WhatsApp is not installed'],
  ['E_SHARE_LAUNCH_FAILED', 'Unable to open WhatsApp with the receipt'],
])('maps native error %s to an actionable message', (code, expected) => {
  expect(getWhatsAppReceiptErrorMessage({ code })).toContain(expected);
});
