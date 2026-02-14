import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

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

export const NotificationService = {
  // 1. Setup Permissions
  requestPermissions: async () => {
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
  },

  // 2. Schedule Prayer Notifications
  schedulePrayerNotifications: async (loc: { lat: number, lng: number }, daysToSchedule = 7) => {
    // First, cancel all existing notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const coordinates = new Coordinates(loc.lat, loc.lng);
    const params = CalculationMethod.Turkey();
    const date = new Date();

    for (let i = 0; i < daysToSchedule; i++) {
        const prayerDate = new Date(date);
        prayerDate.setDate(date.getDate() + i);
        
        const prayerTimes = new PrayerTimes(coordinates, prayerDate, params);
        
        // Schedule for each prayer
        await NotificationService.scheduleSingleNotification(prayerTimes.fajr, "Sabah Namazı Vakti 🌅", "Sabah namazı vakti girdi.");
        await NotificationService.scheduleSingleNotification(prayerTimes.dhuhr, "Öğle Namazı Vakti ☀️", "Öğle namazı vakti girdi.");
        await NotificationService.scheduleSingleNotification(prayerTimes.asr, "İkindi Namazı Vakti 🌤️", "İkindi namazı vakti girdi.");
        await NotificationService.scheduleSingleNotification(prayerTimes.maghrib, "Akşam Namazı Vakti 🌇", "Akşam namazı vakti girdi.");
        await NotificationService.scheduleSingleNotification(prayerTimes.isha, "Yatsı Namazı Vakti 🌌", "Yatsı namazı vakti girdi.");

        // Schedule Check-in: 30 mins AFTER Isha
        const checkInTime = new Date(prayerTimes.isha);
        checkInTime.setMinutes(checkInTime.getMinutes() + 30);
        
        await NotificationService.scheduleSingleNotification(
            checkInTime, 
            "Günü Değerlendir 📝", 
            "Bugünkü ibadetlerini tamamladın mı? Kontrol etmek için dokun."
        );
    }
  },

  scheduleSingleNotification: async (date: Date, title: string, body: string) => {
    // Only schedule if date is in the future
    if (date.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
            },
            // @ts-ignore
            trigger: date, 
        });
        console.log(`Scheduled: ${title} at ${date.toLocaleTimeString()}`);
    }
  },

  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
