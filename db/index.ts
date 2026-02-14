import { format } from 'date-fns';
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
      last_processed_date TEXT,
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
  
  // Ensure columns exist (for migration)
  try {
    const tableInfo: any[] = await database.getAllAsync("PRAGMA table_info(profile)");
    const hasRegularStart = tableInfo.some(col => col.name === 'regular_start_date');
    const hasFastingStart = tableInfo.some(col => col.name === 'fasting_start_date');

    if (!hasRegularStart) {
        await database.execAsync('ALTER TABLE profile ADD COLUMN regular_start_date TEXT');
    }
    if (!hasFastingStart) {
        await database.execAsync('ALTER TABLE profile ADD COLUMN fasting_start_date TEXT');
    }
    
    // Check for last_sync_date
    const hasLastSync = tableInfo.some(col => col.name === 'last_sync_date');
    if (!hasLastSync) {
        await database.execAsync('ALTER TABLE profile ADD COLUMN last_sync_date TEXT');
    }

    // Check for surname, email, profile_image (New fields)
    const hasSurname = tableInfo.some(col => col.name === 'surname');
    if (!hasSurname) await database.execAsync('ALTER TABLE profile ADD COLUMN surname TEXT');

    const hasEmail = tableInfo.some(col => col.name === 'email');
    if (!hasEmail) await database.execAsync('ALTER TABLE profile ADD COLUMN email TEXT');

    const hasProfileImage = tableInfo.some(col => col.name === 'profile_image');
    if (!hasProfileImage) await database.execAsync('ALTER TABLE profile ADD COLUMN profile_image TEXT');

    const hasLastProcessed = tableInfo.some(col => col.name === 'last_processed_date');
    if (!hasLastProcessed) await database.execAsync('ALTER TABLE profile ADD COLUMN last_processed_date TEXT');
    if (!hasProfileImage) await database.execAsync('ALTER TABLE profile ADD COLUMN profile_image TEXT');
    
    // Check for critical fields (just in case)
    const hasGender = tableInfo.some(col => col.name === 'gender');
    if (!hasGender) await database.execAsync("ALTER TABLE profile ADD COLUMN gender TEXT DEFAULT 'male'");

    const hasBirthDate = tableInfo.some(col => col.name === 'birth_date');
    if (!hasBirthDate) await database.execAsync('ALTER TABLE profile ADD COLUMN birth_date TEXT');

    const hasBulughDate = tableInfo.some(col => col.name === 'bulugh_date');
    if (!hasBulughDate) await database.execAsync('ALTER TABLE profile ADD COLUMN bulugh_date TEXT');

  } catch (e) {
    console.log('Profile migration check failed or not needed');
  }

  // Ensure daily_status columns exist (for migration)
  try {
    const tableInfo: any[] = await database.getAllAsync("PRAGMA table_info(daily_status)");
    const hasNote = tableInfo.some(col => col.name === 'note');

    if (!hasNote) {
        await database.execAsync('ALTER TABLE daily_status ADD COLUMN note TEXT');
    }
  } catch (e) {
    console.log('Daily Status migration check failed or not needed');
  }
  
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

// Sync Debts: Adds debt for past days where prayers were not completed
export const syncDebts = async () => {
    const db = getDb();
    
    try {
        // 1. Get Profile and Last Sync
        const profile: any = await db.getAllAsync('SELECT * FROM profile LIMIT 1');
        if (!profile || profile.length === 0) return; // No profile, no sync
        
        const user = profile[0];
        const lastSyncStr = user.last_sync_date || user.created_at; // Default to created_at if null
        const lastSync = new Date(lastSyncStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        // If last sync was today or later, do nothing
        if (lastSync >= today) return; 
        
        // 2. Iterate from Last Sync to Yesterday
        const currentLoopDate = new Date(lastSync);
        currentLoopDate.setDate(currentLoopDate.getDate() + 1); // Start from *next* day of last sync
        currentLoopDate.setHours(0,0,0,0);

        let prayerDebtToAdd = 0;
        let fastingDebtToAdd = 0; // Logic for Ramadan can be added here
        
        while (currentLoopDate < today) {
             const dateStr = currentLoopDate.toISOString().split('T')[0];
             
             // Check completed prayers for this date
             const status: any[] = await db.getAllAsync(
                 'SELECT type FROM daily_status WHERE date = ? AND status = ?', 
                 [dateStr, 'completed']
             );
             
             const completedCount = status.length;
             // Total obligations per day = 5 (excluding Witr for now to keep simple, or 6)
             // User specified 5 prayers usually. Let's assume 5+Witr = 6 or just 5. 
             // "Regular Start Date" usually implies 5 times. Let's stick to 5 Main Prayers for debt.
             // If we include Witr, it's 6.
             
             // Check if Witr is in PRAYER_TYPES. Usually it is. 
             // Let's assume 6 daily obligations (5 farz + 1 witr) OR 5 if user only tracks Farz.
             // Standard naming: fajr, dhuhr, asr, maghrib, isha, witr.
             // Let's count how many distinct types were completed.
             
             const completedTypes = new Set(status.map(s => s.type));
             const requiredTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']; // Witr is wajib, let's stick to 5 Farz for "Namaz Borcu" usually? 
             // Or user wants strict tracking.
             // For now, let's assume 5. 
             
             let missedToday = 0;
             requiredTypes.forEach(type => {
                 if (!completedTypes.has(type)) missedToday++;
             });
             
             prayerDebtToAdd += missedToday;
             
             // Next day
             currentLoopDate.setDate(currentLoopDate.getDate() + 1);
        }
        
        // 3. Update Debt Counts
        if (prayerDebtToAdd > 0) {
            // Distribute debt? Or just add to a general counter?
            // debt_counts table has 'type'. 
            // Simplifying: we should ideally figure out *which* specific prayers were missed.
            // But above loop just calculated *total* count.
            // To be precise: We need to increment specific types.
            
            // Re-running loop to be precise (It's fast enough for a few days)
             // Reset loop
            const loopDate = new Date(lastSync);
            loopDate.setDate(loopDate.getDate() + 1);
            loopDate.setHours(0,0,0,0);
            
            while (loopDate < today) {
                const dateStr = loopDate.toISOString().split('T')[0];
                const status: any[] = await db.getAllAsync(
                     'SELECT type FROM daily_status WHERE date = ? AND status = ?', 
                     [dateStr, 'completed']
                 );
                 const completedTypes = new Set(status.map(s => s.type));
                 const types = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
                 
                 for (const type of types) {
                     if (!completedTypes.has(type)) {
                         await db.runAsync(
                             'UPDATE debt_counts SET count = count + 1 WHERE type = ?', 
                             [type]
                         );
                     }
                 }
                 loopDate.setDate(loopDate.getDate() + 1);
            }
        }
        
        // 4. Update Last Sync Date
        const todayStr = today.toISOString();
        await db.runAsync('UPDATE profile SET last_sync_date = ? WHERE id = ?', [todayStr, user.id]);
        
    } catch (e) {
        console.error('Sync Error:', e);
    }
};

export const getDailyStatus = async (start: Date, end: Date) => {
    const db = getDb();
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    
    // Assuming simple string date query
    const result: any[] = await db.getAllAsync(`
        SELECT * FROM daily_status 
        WHERE date >= ? AND date <= ?
    `, [startStr, endStr]);
    
    return result;
};

export const toggleDailyStatus = async (date: string, type: string, status: string, note?: string) => {
    const db = getDb();
    
    // Check if date is in the past (before today)
    const today = format(new Date(), 'yyyy-MM-dd');
    const isPast = date < today;
    
    // Determine debt change
    let debtChange = 0;
    
    // Get previous status to avoid double counting if switching from 'missed' to 'completed' or vice versa
    // But our UI toggle is binary: completed <-> pending (or null)
    // If status is 'completed':
    //   - Was 'pending'/'missed' -> Debt - 1 (Performed Kaza)
    // If status is 'pending':
    //   - Was 'completed' -> Debt + 1 (Undoing Kaza)
    
    // However, we need to know the *previous* state to be 100% sure, or trust the input status.
    // The UI sends target status.
    
    if (isPast) {
        if (status === 'completed') {
            debtChange = -1; // Paid a debt
        } else if (status === 'pending') {
            debtChange = 1; // Un-paid a debt (maybe accidentally checked)
        }
    }

    if (status === 'pending' && !note) {
        await db.runAsync('DELETE FROM daily_status WHERE date = ? AND type = ?', [date, type]);
    } else {
        await db.runAsync(`
            INSERT INTO daily_status (date, type, status, note) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(date, type) DO UPDATE SET status = excluded.status, note = excluded.note
        `, [date, type, status, note || '']);
    }
    
    // Update debt counts if applicable
    if (debtChange !== 0) {
        await quickUpdateKaza(type, debtChange);
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

export const getDebtCounts = async () => {
    const db = getDb();
    const result: any[] = await db.getAllAsync('SELECT type, count FROM debt_counts');
    
    let prayerDebt = 0;
    let fastingDebt = 0;
    
    result.forEach(row => {
        if (row.type === 'fasting') {
            fastingDebt = row.count;
        } else {
            prayerDebt += row.count;
        }
    });
    
    return { prayerDebt, fastingDebt };
};

export const checkDailyLoop = async () => {
    try {
        const db = getDb();
        const profile = await db.getAllAsync('SELECT * FROM profile LIMIT 1');
        
        if (!profile || profile.length === 0) return;
        const user: any = profile[0];
        
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        // If no last_processed_date, use created_at or today as fallback
        const lastProcessedStr = user.last_processed_date || user.created_at || todayStr;
        const lastProcessed = new Date(lastProcessedStr);
        
        // Reset time components for accurate day difference
        const current = new Date(todayStr); // today at 00:00:00
        const last = new Date(lastProcessedStr.split('T')[0]); // last processed at 00:00:00
        
        // Helper to add days
        const addDays = (date: Date, days: number) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        };
        
        // Iterate from day after last processed until yesterday
        // We only add debt for PASSED days. Today is still active.
        let loopDate = addDays(last, 1);
        
        const prayerTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
        let daysMissed = 0;
        
        while (loopDate < current) { // strictly less than today
            daysMissed++;
            loopDate = addDays(loopDate, 1);
        }
        
        if (daysMissed > 0) {
            console.log(`Daily Loop: Found ${daysMissed} missed days.`);
            
            // Optimization: Update debt counts in bulk
            // Instead of inserting daily rows, we just increment the debt counters
            // This is the "Default Debt" strategy
            
            const totalDebtToAdd = daysMissed; // 1 unit per prayer type per day
            
            for (const type of prayerTypes) {
                await db.runAsync(`
                    INSERT INTO debt_counts (type, count) 
                    VALUES (?, ?)
                    ON CONFLICT(type) DO UPDATE SET count = count + ?
                `, [type, totalDebtToAdd, totalDebtToAdd]);
            }
            
            console.log(`Daily Loop: Added ${totalDebtToAdd} to all prayer debts.`);
        }
        
        // Update last_processed_date to today (so we don't process it again)
        // Even if daysMissed is 0, we update to today to mark it checked
        if (user.last_processed_date !== todayStr) {
            await db.runAsync('UPDATE profile SET last_processed_date = ? WHERE id = ?', [todayStr, user.id]);
        }
        
    } catch (error) {
        console.error('Error in checkDailyLoop:', error);
    }
};
