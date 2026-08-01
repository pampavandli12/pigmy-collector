import { requireOptionalNativeModule } from 'expo-modules-core';
import { Linking, Platform, TurboModuleRegistry } from 'react-native';

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

export function getReceiptSharingUnavailableMessage(): string | null {
  const hasExpoPrint = Boolean(requireOptionalNativeModule('ExpoPrint'));
  const hasNativeShare = Boolean(TurboModuleRegistry.get('RNShare'));

  if (hasExpoPrint && hasNativeShare) return null;

  return 'Receipt sharing requires the latest app build. Please update or reinstall the app.';
}

export function normalizeWhatsAppNumber(phone: unknown): string | null {
  if (typeof phone !== 'string' && typeof phone !== 'number') return null;

  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;

  return digits.length >= 11 && digits.length <= 15 ? digits : null;
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
  const { default: Share, Social } = await import('react-native-share');
  const whatsAppNumber = normalizeWhatsAppNumber(phone);
  if (!whatsAppNumber) throw new WhatsAppUnavailableError();

  if (Platform.OS !== 'android') {
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
    return;
  }

  let social = Social.Whatsapp;
  const whatsapp = await Share.isPackageInstalled('com.whatsapp');
  if (!whatsapp.isInstalled) {
    const business = await Share.isPackageInstalled('com.whatsapp.w4b');
    if (!business.isInstalled) {
      throw new WhatsAppUnavailableError();
    }
    social = Social.Whatsappbusiness;
  }

  if (!social) {
    throw new WhatsAppUnavailableError();
  }

  await Share.shareSingle({
    social,
    url: pdfUri,
    type: 'application/pdf',
    filename,
    message,
    useInternalStorage: true,
    whatsAppNumber,
  } as Parameters<typeof Share.shareSingle>[0] & {
    whatsAppNumber: string;
  });
}
