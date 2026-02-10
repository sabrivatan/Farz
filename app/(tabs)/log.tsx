import { View, Text, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { getDb } from "@/db";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type Log = {
  id: number;
  type: string;
  amount: number;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  fajr: 'Sabah',
  dhuhr: 'Öğle',
  asr: 'İkindi',
  maghrib: 'Akşam',
  isha: 'Yatsı',
  witr: 'Vitir',
  fasting: 'Oruç'
};

export default function LogScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const db = getDb();
      const result: any[] = await db.getAllAsync('SELECT * FROM logs ORDER BY created_at DESC LIMIT 50');
      setLogs(result);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, []);

  const renderItem = ({ item }: { item: Log }) => (
    <View className="bg-slate-900 mb-3 p-4 rounded-xl border border-slate-800 flex-row justify-between items-center">
        <View>
            <Text className="text-white font-bold text-lg">{typeLabels[item.type] || item.type}</Text>
            <Text className="text-slate-500 text-xs">
                {format(new Date(item.created_at), 'd MMMM yyyy HH:mm', { locale: tr })}
            </Text>
        </View>
        <Text className={`${item.amount > 0 ? 'text-red-400' : 'text-emerald-400'} font-bold text-lg`}>
            {item.amount > 0 ? `+${item.amount}` : item.amount}
        </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950 p-6">
      <Text className="text-white text-3xl font-bold mb-6">Geçmiş Kayıtlar</Text>
      
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item: Log) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListEmptyComponent={
            <View className="items-center justify-center mt-20">
                <Text className="text-slate-600">Henüz bir kayıt yok.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}
