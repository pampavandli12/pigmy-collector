import { LocalTransaction, TransactionPayload } from '@/types/user';
import * as SQLite from 'expo-sqlite';
import { DB_NAME, TABLE_NAME } from './constants';

export const fetchLocalTransactions = async (): Promise<LocalTransaction[]> => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const result = await db.getAllAsync(
    `SELECT * FROM ${TABLE_NAME} ORDER BY date DESC LIMIT 10`,
  );
  return result as LocalTransaction[];
};

export const saveTransactionLocally = async (
  transaction: TransactionPayload,
): Promise<void> => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(
    `INSERT INTO ${TABLE_NAME} (userId, collectedAmount, accountNumber, agentCode, bankCode, customerName, date, collectiontype, schemename) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.userId,
      transaction.collectedAmount,
      transaction.accountNumber,
      transaction.agentCode,
      transaction.bankCode,
      transaction.customerName,
      new Date().toISOString(),
      transaction.collectiontype,
      transaction.schemename,
    ],
  );
};
export const fetchTodaysTransactionAmount = async (): Promise<number> => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const result = await db.getAllAsync(
    `SELECT SUM(collectedAmount) as total FROM ${TABLE_NAME} WHERE date LIKE ?`,
    [`${today}%`],
  );
  return (result[0] as { total: number })?.total || 0;
};
export const fetchYesterdaysTransactionAmount = async (): Promise<number> => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Get yesterday's date in YYYY-MM-DD format
  const result = await db.getAllAsync(
    `SELECT SUM(collectedAmount) as total FROM ${TABLE_NAME} WHERE date LIKE ?`,
    [`${yesterday}%`],
  );
  return (result[0] as { total: number })?.total || 0;
};
