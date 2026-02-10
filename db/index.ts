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
      gender TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      bulugh_date TEXT NOT NULL,
      regular_start_date TEXT,
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
