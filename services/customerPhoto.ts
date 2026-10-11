import {
  getPhotoRow,
  getPhotoRowsForBank,
  upsertPhotoRow,
  type CustomerPhotoRow,
} from '@/db/customerPhotoDb';

// Max long-edge dimension and JPEG quality used to compress a photo before
// it's stored. Tunable in one place; keeps the SQLite TEXT payload small
// (roughly tens of KB per photo at these settings) without a visible quality
// loss in the avatar/preview UI this feature actually needs.
const CUSTOMER_PHOTO_MAX_DIMENSION = 800;
const CUSTOMER_PHOTO_JPEG_QUALITY = 0.5;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export interface CustomerPhotoKey {
  bankCode: string;
  accountNumber: number;
}

type ExpoImageManipulator = typeof import('expo-image-manipulator');

export interface CustomerPhotoCompressDependencies {
  manipulateAsync: ExpoImageManipulator['manipulateAsync'];
  SaveFormat: ExpoImageManipulator['SaveFormat'];
}

function photoKeyString(key: CustomerPhotoKey): string {
  return `${key.bankCode}:${key.accountNumber}`;
}

function toDataUri(row: Pick<CustomerPhotoRow, 'photo_base64' | 'mime_type'>): string | null {
  if (!row.photo_base64 || !BASE64_PATTERN.test(row.photo_base64)) {
    return null;
  }
  return `data:${row.mime_type};base64,${row.photo_base64}`;
}

async function compressPhoto(
  sourceUri: string,
  dependencies?: CustomerPhotoCompressDependencies,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const { manipulateAsync, SaveFormat } =
      dependencies ?? (await import('expo-image-manipulator'));
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: CUSTOMER_PHOTO_MAX_DIMENSION } }],
      {
        compress: CUSTOMER_PHOTO_JPEG_QUALITY,
        format: SaveFormat.JPEG,
        base64: true,
      },
    );
    if (!result.base64) return null;
    return { base64: result.base64, mimeType: 'image/jpeg' };
  } catch (error) {
    console.warn('Compressing customer photo failed.', error);
    return null;
  }
}

export async function saveCustomerPhoto(
  key: CustomerPhotoKey,
  sourceUri: string,
  dependencies?: CustomerPhotoCompressDependencies,
): Promise<string | null> {
  const compressed = await compressPhoto(sourceUri, dependencies);
  if (!compressed) return null;

  const saved = await upsertPhotoRow({
    bankCode: key.bankCode,
    accountNumber: key.accountNumber,
    photoBase64: compressed.base64,
    mimeType: compressed.mimeType,
  });
  if (!saved) return null;

  return toDataUri({
    photo_base64: compressed.base64,
    mime_type: compressed.mimeType,
  });
}

export async function getCustomerPhoto(
  key: CustomerPhotoKey,
): Promise<string | null> {
  const row = await getPhotoRow(key.bankCode, key.accountNumber);
  if (!row) return null;
  return toDataUri(row);
}

export async function getCustomerPhotosBatch(
  keys: CustomerPhotoKey[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (keys.length === 0) return result;

  const bankCodes = Array.from(new Set(keys.map((key) => key.bankCode)));
  const wantedAccountsByBank = new Map<string, Set<number>>();
  for (const key of keys) {
    const set = wantedAccountsByBank.get(key.bankCode) ?? new Set<number>();
    set.add(key.accountNumber);
    wantedAccountsByBank.set(key.bankCode, set);
  }

  for (const bankCode of bankCodes) {
    const rows = await getPhotoRowsForBank(bankCode);
    const wantedAccounts = wantedAccountsByBank.get(bankCode);
    for (const row of rows) {
      if (!wantedAccounts?.has(row.account_number)) continue;
      const dataUri = toDataUri(row);
      if (!dataUri) continue;
      result[photoKeyString({ bankCode, accountNumber: row.account_number })] = dataUri;
    }
  }

  return result;
}

export function buildCustomerPhotoKey(key: CustomerPhotoKey): string {
  return photoKeyString(key);
}
