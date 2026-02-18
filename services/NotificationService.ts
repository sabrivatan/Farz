import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Create a channel for Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('prayer-channel', {
    name: 'Ezan Vakti',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default', // or a custom sound file
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export const NotificationService = {
  // 1. Setup Permissions
  requestPermissions: async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
        }
        return true;
    } catch (e) {
        console.error('Error requesting permissions:', e);
        return false;
    }
  },

  // ... (schedulePrayerNotifications logic remains same)
  schedulePrayerNotifications: async (loc: { lat: number, lng: number }, daysToSchedule = 7) => {
    try {
        console.log('[NotificationService] Scheduling started for coordinates:', loc);
        
        // First, cancel all existing notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Load User Preferences
        let prayerReminders = {
            fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
        };
        try {
            const savedReminders = await AsyncStorage.getItem('settings.prayer_reminders');
            if (savedReminders) {
                prayerReminders = JSON.parse(savedReminders);
            }
        } catch (e) {
            console.log('Error loading prayer reminders for scheduling', e);
        }

        const coordinates = new Coordinates(loc.lat, loc.lng);
        const params = CalculationMethod.Turkey();
        const date = new Date(); // Start from NOW

        let scheduledCount = 0;

        for (let i = 0; i < daysToSchedule; i++) {
            const prayerDate = new Date(date);
            prayerDate.setDate(date.getDate() + i);
            
            const prayerTimes = new PrayerTimes(coordinates, prayerDate, params);
            
            // Schedule for each prayer IF ENABLED
            if (prayerReminders.fajr) {
                await NotificationService.scheduleSingleNotification(prayerTimes.fajr, "Sabah Namazı Vakti 🌅", "Sabah namazı vakti girdi.");
                scheduledCount++;
            }
            if (prayerReminders.dhuhr) {
                await NotificationService.scheduleSingleNotification(prayerTimes.dhuhr, "Öğle Namazı Vakti ☀️", "Öğle namazı vakti girdi.");
                scheduledCount++;
            }
            if (prayerReminders.asr) {
                await NotificationService.scheduleSingleNotification(prayerTimes.asr, "İkindi Namazı Vakti 🌤️", "İkindi namazı vakti girdi.");
                scheduledCount++;
            }
            if (prayerReminders.maghrib) {
                await NotificationService.scheduleSingleNotification(prayerTimes.maghrib, "Akşam Namazı Vakti 🌇", "Akşam namazı vakti girdi.");
                scheduledCount++;
            }
            if (prayerReminders.isha) {
                await NotificationService.scheduleSingleNotification(prayerTimes.isha, "Yatsı Namazı Vakti 🌌", "Yatsı namazı vakti girdi.");
                scheduledCount++;
            }

            // Schedule Check-in: 30 mins AFTER Isha
            const checkInTime = new Date(prayerTimes.isha);
            checkInTime.setMinutes(checkInTime.getMinutes() + 30);
            
            await NotificationService.scheduleSingleNotification(
                checkInTime, 
                "Günü Değerlendir 📝", 
                "Bugünkü ibadetlerini tamamladın mı? Kontrol etmek için dokun."
            );
        }
        console.log(`[NotificationService] Successfully scheduled ~${scheduledCount} notifications for next ${daysToSchedule} days.`);
    } catch (e) {
        console.error('[NotificationService] Error scheduling notifications:', e);
    }
  },

  scheduleSingleNotification: async (date: Date, title: string, body: string) => {
    // Only schedule if date is in the future
    if (date.getTime() > Date.now()) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: 'default', // Android uses channel sound
                    data: { url: '/(tabs)/' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: date, // Pass Date object or timestamp
                    channelId: Platform.OS === 'android' ? 'prayer-channel' : undefined,
                }, 
            });
            // console.log(`Scheduled: ${title} at ${date.toLocaleTimeString()}`);
        } catch (e) {
            console.error('[NotificationService] Error scheduling single notification:', e);
        }
    }
  },

  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
