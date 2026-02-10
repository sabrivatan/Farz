import { Tabs } from "expo-router";
import { Home, Calendar, BarChart2, User } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
            backgroundColor: '#3E322A',
            borderTopWidth: 0,
            elevation: 0,
            height: 80,
            paddingBottom: 20,
            paddingTop: 10,
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: -4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        tabBarActiveTintColor: '#CD853F',
        tabBarInactiveTintColor: 'rgba(220, 203, 181, 0.6)',
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
    </Tabs>
  );
}
