import * as SQLite from 'expo-sqlite';

// Independent SQLite store for customer photos, deliberately separate from
// the MMKV/Legend-State persistence the rest of the app uses (see
// AGENTS.md "State, Offline Sync & SQLite"). A failure anywhere in this file
// must never propagate as a thrown error — every exported function resolves
// to a safe default (null) instead, so a broken/unavailable photo DB can
// never crash deposits, sync, or any other part of the app.

const DATABASE_NAME = 'customer-photos.db';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS customer_photos (
  bank_code TEXT NOT NULL,
  account_number INTEGER NOT NULL,
  photo_base64 TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (bank_code, account_number)
);
`;

export interface CustomerPhotoRow {
  bank_code: string;
  account_number: number;
  photo_base64: string;
  mime_type: string;
  updated_at: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
// Once the DB has failed to open/migrate, stop retrying on every call so a
// broken native module (e.g. a dev client that wasn't rebuilt after adding
// expo-sqlite) doesn't get hammered on every avatar render.
let dbUnavailable = false;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(CREATE_TABLE_SQL);
  return db;
}

async function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (dbUnavailable) return null;
  if (!dbPromise) {
    dbPromise = openDb();
  }
  try {
    return await dbPromise;
  } catch (error) {
    dbUnavailable = true;
    dbPromise = null;
    console.warn('Customer photo database unavailable; photos will be hidden.', error);
    return null;
  }
}

function normalizeBankCode(bankCode: string): string {
  return bankCode.trim();
}

export async function getPhotoRow(
  bankCode: string,
  accountNumber: number,
): Promise<CustomerPhotoRow | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const row = await db.getFirstAsync<CustomerPhotoRow>(
      'SELECT * FROM customer_photos WHERE bank_code = ? AND account_number = ?',
      [normalizeBankCode(bankCode), accountNumber],
    );
    return row ?? null;
  } catch (error) {
    console.warn('Customer photo lookup failed.', error);
    return null;
  }
}

export async function getPhotoRowsForBank(
  bankCode: string,
): Promise<CustomerPhotoRow[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.getAllAsync<CustomerPhotoRow>(
      'SELECT * FROM customer_photos WHERE bank_code = ?',
      [normalizeBankCode(bankCode)],
    );
  } catch (error) {
    console.warn('Customer photo batch lookup failed.', error);
    return [];
  }
}

export async function upsertPhotoRow(row: {
  bankCode: string;
  accountNumber: number;
  photoBase64: string;
  mimeType: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.runAsync(
      `INSERT INTO customer_photos (bank_code, account_number, photo_base64, mime_type, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (bank_code, account_number)
       DO UPDATE SET photo_base64 = excluded.photo_base64, mime_type = excluded.mime_type, updated_at = excluded.updated_at`,
      [
        normalizeBankCode(row.bankCode),
        row.accountNumber,
        row.photoBase64,
        row.mimeType,
        Date.now(),
      ],
    );
    return true;
  } catch (error) {
    console.warn('Saving customer photo failed.', error);
    return false;
  }
}
