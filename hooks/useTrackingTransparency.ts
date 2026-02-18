import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';

export function useTrackingTransparency() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    let appStateSubscription: any;

    const requestPermission = async () => {
      // Check current permission status
      const { status: currentStatus } = await getTrackingPermissionsAsync();
      
      if (currentStatus === 'granted' || currentStatus === 'denied') {
         setPermissionStatus(currentStatus);
         return;
      }

      // If not determined, request permission
      // We wait a short moment to ensure the app is fully active
      setTimeout(async () => {
        const { status } = await requestTrackingPermissionsAsync();
        setPermissionStatus(status);
      }, 1000);
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        requestPermission();
      }
    };

    // Request on mount if active
    if (AppState.currentState === 'active') {
      requestPermission();
    }

    // Also listen for app state changes (in case app comes from background)
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, []);

  return permissionStatus;
}
