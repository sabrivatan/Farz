import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

import { Platform } from 'react-native';

// Mock DB for Web
const webDb = {
  execAsync: async () => {},
  runAsync: async () => {},
  getAllAsync: async (query: string) => {
    if (query.includes('count')) return [{ count: 0 }];
    if (query.includes('profile')) return [];
    if (query.includes('debt_counts')) return []; // Will trigger default init
    return [];
  },
  withTransactionAsync: async (callback: () => Promise<void>) => await callback(),
};

// Function to get or initialize the database connection
export const getDb = () => {
    if (Platform.OS === 'web') {
        return webDb as any;
    }
  if (!db) {
    db = SQLite.openDatabaseSync('farz.db');
  }
  return db;
};

export const initDatabase = async () => {
  const database = getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT,
      surname TEXT,
      email TEXT,
      gender TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      bulugh_date TEXT NOT NULL,
      regular_start_date TEXT,
      fasting_start_date TEXT,
      profile_image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debt_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE, -- 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr', 'fasting'
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL, -- negative for performed (kaza), positive for missed
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, -- YYYY-MM-DD
      type TEXT NOT NULL, -- fajr, dhuhr, etc.
      status TEXT NOT NULL, -- completed, missed, late
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, type)
    );
  `);
  
  // Initialize default debt types if empty
  const result: any[] = await database.getAllAsync('SELECT count(*) as count FROM debt_counts');
  
  if (result[0].count === 0) {
    const types = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr', 'fasting'];
    for (const type of types) {
      await database.runAsync('INSERT INTO debt_counts (type, count) VALUES (?, 0)', [type]);
    }
  }
};

export const initDB = initDatabase;

export const getDailyStatus = async (start: Date, end: Date) => {
    const db = getDb();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    // Assuming simple string date query
    const result: any[] = await db.getAllAsync(`
        SELECT * FROM daily_status 
        WHERE date >= ? AND date <= ?
    `, [startStr, endStr]);
    
    return result;
};

export const toggleDailyStatus = async (date: string, type: string, status: string, note?: string) => {
    const db = getDb();
    
    if (status === 'pending' && !note) {
        await db.runAsync('DELETE FROM daily_status WHERE date = ? AND type = ?', [date, type]);
    } else {
        await db.runAsync(`
            INSERT INTO daily_status (date, type, status, note) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(date, type) DO UPDATE SET status = excluded.status, note = excluded.note
        `, [date, type, status, note || '']);
        // If updating status, also update debt counts if logic dictates
    }
};

export const quickUpdateKaza = async (type: string, amount: number) => {
    const db = getDb();
    // Assuming debt_counts table exists: type, count
     await db.runAsync(`
        INSERT INTO debt_counts (type, count) 
        VALUES (?, ?)
        ON CONFLICT(type) DO UPDATE SET count = count + ?
    `, [type, amount, amount]);
     
     // Log logic
    if (amount !== 0) {
        await db.runAsync('INSERT INTO logs (type, amount) VALUES (?, ?)', [type, amount]);
    }
};

export const getMonthlyStats = async (month: Date) => {
    // Placeholder for stats logic if needed
    return {};
};
