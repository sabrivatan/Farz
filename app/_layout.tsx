import "../global.css";
import "react-native-reanimated";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../lib/i18n"; // Initialize i18n

import { useEffect } from 'react';
import mobileAds from '@/lib/admob';

export default function Layout() {
  useEffect(() => {
    try {
      if (mobileAds) {
        mobileAds()
            .initialize()
            .then((adapterStatuses: any) => {
            // Initialization complete!
            });
      }
    } catch (e) {
      console.log('AdMob module not found (running in Expo Go?)');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
