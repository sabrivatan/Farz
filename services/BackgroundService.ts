import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { NotificationService } from './NotificationService';

const BACKGROUND_FETCH_TASK = 'background-fetch-notifications';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // 0. Refresh Prayer Notifications (Always try to schedule if we have location)
    try {
        const lastLocationStr = await AsyncStorage.getItem('last_known_location');
        if (lastLocationStr) {
            const lastLocation = JSON.parse(lastLocationStr);
            if (lastLocation.lat && lastLocation.lng) {
                 await NotificationService.schedulePrayerNotifications(lastLocation);
                 console.log('Background: Refreshed prayer schedule');
            }
        }
    } catch (e) {
        console.log('Background: Failed to refresh prayer schedule', e);
    }

    // 1. Check if General Notifications are enabled
    const enabled = await AsyncStorage.getItem('settings.general_notifications');
    if (enabled === 'false') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. Fetch latest notification
    const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const latestNotification = data[0];
    const lastNotifiedId = await AsyncStorage.getItem('last_background_notification_id');

    // 3. If new notification, trigger local notification
    if (latestNotification.id !== lastNotifiedId) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: latestNotification.title,
                body: latestNotification.message,
                data: { id: latestNotification.id },
            },
            trigger: null, // Show immediately
        });

        await AsyncStorage.setItem('last_background_notification_id', latestNotification.id);
        await AsyncStorage.setItem('latest_general_notification_date', latestNotification.created_at); // Save date
        return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    // Even if not new, ensure we have the date for the badge logic
    await AsyncStorage.setItem('latest_general_notification_date', latestNotification.created_at);

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundFetchAsync = async () => {
    try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60 * 15, // 15 minutes
            stopOnTerminate: false, // Android only
            startOnBoot: true, // Android only
        });
        console.log('Background fetch registered');
    } catch (err) {
        console.log('Background fetch register failed:', err);
    }
};

export const unregisterBackgroundFetchAsync = async () => {
   try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('Background fetch unregistered');
   } catch (err) {
    console.log('Background fetch unregister failed:', err);
   }
};
