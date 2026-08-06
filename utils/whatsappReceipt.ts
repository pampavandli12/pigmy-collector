import { requireOptionalNativeModule } from 'expo-modules-core';
import { Linking, Platform, TurboModuleRegistry } from 'react-native';

interface WhatsAppReceiptNativeModule {
  sharePdfReceipt(
    fileUri: string,
    phoneNumber: string,
  ): Promise<{ packageName: 'com.whatsapp' | 'com.whatsapp.w4b' }>;
}

function getWhatsAppReceiptModule(): WhatsAppReceiptNativeModule | null {
  return requireOptionalNativeModule<WhatsAppReceiptNativeModule>(
    'ExpoWhatsAppReceipt',
  );
}

export interface WhatsAppReceiptShareInput {
  pdfUri: string;
  phone: string;
  message: string;
  filename: string;
}

export class WhatsAppUnavailableError extends Error {
  constructor() {
    super('WhatsApp is not available on this device.');
    this.name = 'WhatsAppUnavailableError';
  }
}

export class InvalidWhatsAppNumberError extends Error {
  constructor() {
    super('The customer phone number is invalid.');
    this.name = 'InvalidWhatsAppNumberError';
  }
}

export function getReceiptSharingUnavailableMessage(): string | null {
  const hasExpoPrint = Boolean(requireOptionalNativeModule('ExpoPrint'));
  const hasNativeShare =
    Platform.OS === 'android'
      ? Boolean(getWhatsAppReceiptModule())
      : Boolean(TurboModuleRegistry.get('RNShare'));

  if (hasExpoPrint && hasNativeShare) return null;

  return 'Receipt sharing requires the latest app build. Please update or reinstall the app.';
}

export function normalizeWhatsAppNumber(phone: unknown): string | null {
  if (typeof phone !== 'string' && typeof phone !== 'number') return null;

  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  if (digits.length === 10) digits = `91${digits}`;

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function hasUsablePhoneNumber(phone: unknown): boolean {
  return normalizeWhatsAppNumber(phone) !== null;
}

export function isShareCancellationError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return /cancel|dismiss/i.test(message);
}

export async function shareReceiptToWhatsApp({
  pdfUri,
  phone,
  message,
  filename,
}: WhatsAppReceiptShareInput): Promise<void> {
  const whatsAppNumber = normalizeWhatsAppNumber(phone);
  if (!whatsAppNumber) throw new InvalidWhatsAppNumberError();

  if (Platform.OS === 'android') {
    const WhatsAppReceiptModule = getWhatsAppReceiptModule();
    if (!WhatsAppReceiptModule) throw new WhatsAppUnavailableError();
    await WhatsAppReceiptModule.sharePdfReceipt(pdfUri, whatsAppNumber);
    return;
  }

  const { default: Share } = await import('react-native-share');

  if (!(await Linking.canOpenURL('whatsapp://send'))) {
    throw new WhatsAppUnavailableError();
  }

  await Share.open({
    url: pdfUri,
    type: 'application/pdf',
    filename,
    message,
    failOnCancel: true,
  });
}

export function getWhatsAppReceiptErrorMessage(error: unknown): string {
  if (error instanceof InvalidWhatsAppNumberError) return error.message;
  if (error instanceof WhatsAppUnavailableError) return error.message;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'E_INVALID_PHONE_NUMBER':
      return 'The customer phone number is invalid.';
    case 'E_RECEIPT_FILE_UNAVAILABLE':
    case 'E_INVALID_FILE_URI':
    case 'E_FILE_PERMISSION':
      return 'The receipt PDF could not be prepared. Please try again.';
    case 'E_WHATSAPP_UNAVAILABLE':
      return 'WhatsApp is not installed on this device.';
    case 'E_ACTIVITY_UNAVAILABLE':
      return 'Return to the app and try sharing the receipt again.';
    case 'E_SHARE_UNSUPPORTED':
    case 'E_SHARE_LAUNCH_FAILED':
      return 'Unable to open WhatsApp with the receipt. Please try again.';
    default:
      return 'Unable to create or share the receipt on WhatsApp.';
  }
}
