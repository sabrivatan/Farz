import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { initDatabase, getDb } from "@/db";
import { View, Text } from "react-native";
import CustomSplashScreen from "@/components/CustomSplashScreen";

export default function Index() {
  const router = useRouter();
  const [status, setStatus] = useState("Başlatılıyor...");

  useEffect(() => {
    async function prepare() {
        try {
            setStatus("Veritabanı hazırlanıyor...");
            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay
            
            await initDatabase();
            
            const db = getDb();
            const result: any[] = await db.getAllAsync("SELECT * FROM profile LIMIT 1");
            
            setStatus("Yönlendiriliyor...");
            if (result.length === 0) {
                router.replace("/onboarding");
            } else {
                router.replace("/(tabs)");
            }
            
        } catch (e) {
            console.warn("Startup error:", e);
            setStatus("Hata oluştu, yönlendiriliyor...");
            router.replace("/onboarding");
        }
    }

    prepare();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
        <CustomSplashScreen />
    </View>
  );
}
