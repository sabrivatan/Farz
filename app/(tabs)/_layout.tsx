import { Tabs } from "expo-router";
import { Home, Calendar, BarChart2, User } from "lucide-react-native";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import hook
import { checkDailyLoop } from "@/db";

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // Get safe area insets

  useEffect(() => {
    checkDailyLoop();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
            backgroundColor: '#064e3b',
            borderTopWidth: 0,
            elevation: 0,
            height: 60 + insets.bottom, // Dynamic height: 60px base + safe area
            paddingBottom: insets.bottom, // Dynamic padding
            paddingTop: 10,
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: -4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        tabBarActiveTintColor: '#D2691E',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "İstatistik",
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="log"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }, // Hide tab bar on qibla screen if possible
        }}
      />
       <Tabs.Screen
        name="zikir"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
