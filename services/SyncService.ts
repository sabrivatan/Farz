import { getDb } from '@/db';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const SyncService = {
  
  // BACKUP: SQLite -> Supabase
  backupData: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, message: 'Oturum açılmadı.' }; // Silent return for local-only users

      const userId = session.user.id;
      const db = getDb();

          // 1. Profile
          const profileResult: any = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
          if (profileResult) {
            const { error } = await supabase.from('profiles').upsert({
              id: userId,
              name: profileResult.name,
              surname: profileResult.surname,
              email: session.user.email, 
              gender: profileResult.gender,
              birth_date: profileResult.birth_date,
              bulugh_date: profileResult.bulugh_date,
              profile_image: profileResult.profile_image,
              regular_start_date: profileResult.regular_start_date,
              fasting_start_date: profileResult.fasting_start_date,
              last_processed_date: profileResult.last_processed_date,
              updated_at: new Date().toISOString(),
            });
            if (error) throw error;
          }

      // 2. Debt Counts
      const debts: any[] = await db.getAllAsync('SELECT * FROM debt_counts');
      if (debts.length > 0) {
        const debtPayload = debts.map(d => ({
          user_id: userId,
          type: d.type,
          count: d.count,
          updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabase.from('debt_counts').upsert(debtPayload, { onConflict: 'user_id, type' });
        if (error) throw error;
      }

      // 3. Daily Status
      const dailyStatus: any[] = await db.getAllAsync('SELECT * FROM daily_status');
      if (dailyStatus.length > 0) {
         const statusPayload = dailyStatus.map(s => ({
            user_id: userId,
            date: s.date,
            type: s.type,
            status: s.status,
            note: s.note,
            updated_at: new Date().toISOString(),
         }));
         
         const { error } = await supabase.from('daily_status').upsert(statusPayload, { onConflict: 'user_id, date, type' });
         if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Backup Error:', error);
      return { success: false, message: error.message };
    }
  },

  // RESTORE: Supabase -> SQLite
  restoreData: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum açılmadı.');

      const userId = session.user.id;
      const db = getDb();

      // Wrap in transaction for safety and performance
      await db.withTransactionAsync(async () => {
          // 1. Profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') throw profileError;

          if (profile) {
              // Check if local profile exists
              const existing: any = await db.getFirstAsync('SELECT id FROM profile LIMIT 1');
              if (existing) {
                  await db.runAsync(`
                      UPDATE profile SET 
                        name = ?, surname = ?, gender = ?, birth_date = ?, bulugh_date = ?, profile_image = ?, regular_start_date = ?, fasting_start_date = ?, last_processed_date = ?, email = ?
                      WHERE id = ?
                  `, [
                      profile.name || '', 
                      profile.surname || '', 
                      profile.gender || 'male', 
                      profile.birth_date || '', 
                      profile.bulugh_date || '', 
                      profile.profile_image || '', 
                      profile.regular_start_date || '',
                      profile.fasting_start_date || '',
                      profile.last_processed_date || new Date().toISOString(), 
                      profile.email || '', 
                      existing.id
                  ]);
              } else {
                  // Create new profile row locally
                  await db.runAsync(`
                      INSERT INTO profile (name, surname, gender, birth_date, bulugh_date, profile_image, regular_start_date, fasting_start_date, last_processed_date, email)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                      profile.name || '', 
                      profile.surname || '', 
                      profile.gender || 'male', 
                      profile.birth_date || '', 
                      profile.bulugh_date || '', 
                      profile.profile_image || '', 
                      profile.regular_start_date || '',
                      profile.fasting_start_date || '',
                      profile.last_processed_date || new Date().toISOString(), 
                      profile.email || ''
                  ]);
              }
          }

          // 2. Debt Counts
          const { data: debts, error: debtError } = await supabase
            .from('debt_counts')
            .select('*')
            .eq('user_id', userId);
            
          if (debtError) throw debtError;

          if (debts && debts.length > 0) {
              for (const debt of debts) {
                  await db.runAsync(`
                      INSERT INTO debt_counts (type, count) VALUES (?, ?)
                      ON CONFLICT(type) DO UPDATE SET count = excluded.count
                  `, [debt.type, debt.count]);
              }
          }

          // 3. Daily Status
          const { data: statuses, error: statusError } = await supabase
             .from('daily_status')
             .select('*')
             .eq('user_id', userId);
             
          if (statusError) throw statusError;

          if (statuses && statuses.length > 0) {
              for (const status of statuses) {
                 await db.runAsync(`
                      INSERT INTO daily_status (date, type, status, note) 
                      VALUES (?, ?, ?, ?)
                      ON CONFLICT(date, type) DO UPDATE SET status = excluded.status, note = excluded.note
                   `, [status.date, status.type, status.status, status.note]);
              }
          }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Restore Error:', error);
      return { success: false, message: error.message };
    }
  }
};
