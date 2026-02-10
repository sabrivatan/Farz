import { View, Text, ScrollView, TouchableOpacity, Dimensions, FlatList } from "react-native";
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";
// @ts-ignore
import { getDb } from "@/db";
import { Bell, Settings, Plus, User, X, Check, Sunrise, Sun, Sunset, Moon, CloudSun, History, MoonStar } from "lucide-react-native";
import { CalculationMethod, PrayerTimes, Coordinates } from 'adhan';
import CircularProgress from "@/components/CircularProgress";
import { LinearGradient } from "expo-linear-gradient";

const { width: WINDOW_WIDTH } = Dimensions.get('window'); // Default width
// We will use useWindowDimensions hook inside the component for better responsiveness

type DebtCounts = {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  witr: number;
  fasting: number;
};

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export default function Dashboard() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = Dimensions.get('window'); // Get dynamic width
  const [debts, setDebts] = useState<DebtCounts>({
    fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0, fasting: 0
  });
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [dailyStatus, setDailyStatus] = useState<{ [key: string]: 'completed' | 'missed' | null }>({});
  
  // Ref for FlatList
  const flatListRef = useRef<FlatList>(null);
  
  // Ref for main scrolling if needed, currently main content scrolls vertically
  const scrollViewRef = useRef<ScrollView>(null);

  const prayers: { key: PrayerKey; label: string; icon: React.ReactNode }[] = [
    { key: 'fajr', label: 'Sabah', icon: <Sunrise size={32} color="#CD853F" /> },
    { key: 'dhuhr', label: 'Öğle', icon: <Sun size={32} color="#CD853F" /> },
    { key: 'asr', label: 'İkindi', icon: <CloudSun size={32} color="#CD853F" /> },
    { key: 'maghrib', label: 'Akşam', icon: <Sunset size={32} color="#CD853F" /> },
    { key: 'isha', label: 'Yatsı', icon: <Moon size={32} color="#CD853F" /> },
  ];

  useEffect(() => {
    fetchDebts();
    calculatePrayerTimes();
    fetchDailyStatus();
  }, []);

  // Scroll to current prayer when times are loaded
  useEffect(() => {
      if (prayerTimes && flatListRef.current) {
          // Delay slightly to ensure layout is ready
          setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: currentPrayerIndex, animated: true });
          }, 500);
      }
  }, [prayerTimes]); // Depend on prayerTimes loading, currentPrayerIndex is set inside calculatePrayerTimes

  const fetchDebts = async () => {
    try {
      const db = getDb();
      const result: any[] = await db.getAllAsync('SELECT * FROM debt_counts');
      
      const newDebts = { ...debts };
      result.forEach((row: any) => {
        // @ts-ignore
        newDebts[row.type] = row.count;
      });
      setDebts(newDebts);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDailyStatus = async () => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        const result: any[] = await db.getAllAsync('SELECT * FROM daily_status WHERE date = ?', [today]);
        
        const statusMap: any = {};
        result.forEach((row: any) => {
            statusMap[row.type] = row.status;
        });
        setDailyStatus(statusMap);
    } catch (e) {
        console.error("Error fetching daily status:", e);
    }
  };

  const calculatePrayerTimes = () => {
    // Istanbul coordinates (default)
    const coordinates = new Coordinates(41.0082, 28.9784);
    const params = CalculationMethod.Turkey();
    const date = new Date();
    const times = new PrayerTimes(coordinates, date, params);
    setPrayerTimes(times);

    // Determine current prayer
    const now = new Date();
    let index = 0;
    if (now >= times.isha) index = 4;
    else if (now >= times.maghrib) index = 3;
    else if (now >= times.asr) index = 2;
    else if (now >= times.dhuhr) index = 1;
    else if (now >= times.fajr) index = 0;
    
    setCurrentPrayerIndex(index);
  };

  const getTimeRemaining = (prayerTime: Date) => {
    const now = new Date();
    const diff = prayerTime.getTime() - now.getTime();
    if (diff < 0) return "Geçti";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  
  const getFormatTime = (prayerTime: Date) => {
      const hours = prayerTime.getHours().toString().padStart(2, '0');
      const minutes = prayerTime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
  }

  const getNextPrayerTime = (index: number): Date | null => {
    if (!prayerTimes) return null;
    const prayerTimesList = [
      prayerTimes.fajr,
      prayerTimes.dhuhr,
      prayerTimes.asr,
      prayerTimes.maghrib,
      prayerTimes.isha
    ];
    // Show time for current prayer (start time) and countdown to next
    return index < prayerTimesList.length - 1 ? prayerTimesList[index + 1] : null;
  };
  
  const getCurrentPrayerTime = (index: number): Date | null => {
      if (!prayerTimes) return null;
      const prayerTimesList = [
        prayerTimes.fajr,
        prayerTimes.dhuhr,
        prayerTimes.asr,
        prayerTimes.maghrib,
        prayerTimes.isha
      ];
      return prayerTimesList[index];
  }

  const handlePrayerAction = async (prayerKey: string, action: 'completed' | 'missed') => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        
        // Optimistic update
        setDailyStatus(prev => ({ ...prev, [prayerKey]: action }));
        
        // Save to DB
        await db.runAsync(
            'INSERT OR REPLACE INTO daily_status (date, type, status) VALUES (?, ?, ?)',
            [today, prayerKey, action]
        );

        // TODO: Handle Debt Logic here if needed (e.g. if missed -> increment debt)
        // For now, simple logging status. The History screen will manage discrepancies.
        
    } catch (e) {
        console.error("Error saving prayer status:", e);
        // Revert optimistic update? Or show error toast.
    }
  };

  const totalPrayerDebt = Object.entries(debts)
    .filter(([key]) => key !== 'fasting')
    .reduce((sum, [_, count]) => sum + count, 0);

  const prayerProgress = Math.max(0, Math.min(100, 72));
  const fastingProgress = Math.max(0, Math.min(100, 45));

  const currentPrayer = prayers[currentPrayerIndex];
  const nextPrayerTime = getNextPrayerTime(currentPrayerIndex);
  const currentPrayerTimeObj = getCurrentPrayerTime(currentPrayerIndex);

  return (
    <View className="flex-1 bg-[#3E322A]">
        {/* Background Effects (Simulated Blur) */}
        <View style={{ position: 'absolute', top: -100, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: '#CD853F', opacity: 0.1, transform: [{ scale: 2 }] }} />
        <View style={{ position: 'absolute', top: 300, right: -100, width: 200, height: 200, borderRadius: 100, backgroundColor: '#DCCBB5', opacity: 0.05, transform: [{ scale: 2 }] }} />

      <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Content Wrapper */}
            <View>
              <View className="px-5 pt-4 pb-4">
              
              {/* Header */}
              <View className="flex-row justify-between items-center mb-8 border-b border-white/5 pb-4">
                <View className="flex-row items-center gap-3">
                  <View className="bg-[#CD853F]/20 p-2 rounded-full">
                    <User size={24} color="#CD853F" />
                  </View>
                  <View>
                    <Text className="text-[#DCCBB5]/70 text-xs font-medium">Selamün Aleyküm,</Text>
                    <Text className="text-[#F5F0E1] font-bold text-sm">Ahmet Yılmaz</Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity className="p-2 rounded-full bg-white/5">
                    <Bell size={20} color="#F5F0E1" />
                    <View className="absolute top-2 right-2 w-2 h-2 bg-[#CD853F] rounded-full border-2 border-[#3E322A]" />
                  </TouchableOpacity>

                </View>
              </View>

              {/* Summary Section */}
              <View className="mb-6">
                <Text className="text-2xl font-bold tracking-tight text-white mb-1">Özet Durum</Text>
                <Text className="text-sm text-[#DCCBB5]/80">Yolculuğunda güzel ilerliyorsun.</Text>
              </View>

              {/* Progress Cards Grid */}
              <View className="flex-row gap-4 mb-8">
                {/* NAMAZ CARD */}
                <TouchableOpacity 
                  className="flex-1 bg-[#4A3D35] border border-white/5 rounded-3xl p-5 items-center justify-between min-h-[180px]"
                  onPress={() => router.push({ pathname: '/(tabs)/stats', params: { tab: 'prayer' }})}
                >
                  <CircularProgress
                    size={90}
                    strokeWidth={8}
                    progress={prayerProgress} // This percent should come from stats logic ideally
                    color="#CD853F"
                    trackColor="#2D241E"
                    textColor="#F5F0E1"
                    showPercentage={true}
                  />
                  <View className="items-center mt-3">
                      <Text className="text-[10px] font-bold text-[#DCCBB5]/60 tracking-widest uppercase mb-1">NAMAZ İLERLEMESİ</Text>
                      <Text className="text-2xl font-bold text-white">{totalPrayerDebt.toLocaleString()}</Text>
                      <Text className="text-[10px] text-[#DCCBB5]/40 mt-1">Kalan İbadet</Text>
                  </View>
                </TouchableOpacity>

                {/* ORUC CARD */}
                <TouchableOpacity 
                  className="flex-1 bg-[#4A3D35] border border-white/5 rounded-3xl p-5 items-center justify-between min-h-[180px]"
                  onPress={() => router.push({ pathname: '/(tabs)/stats', params: { tab: 'fasting' }})}
                >
                  <CircularProgress
                    size={90}
                    strokeWidth={8}
                    progress={fastingProgress}
                    color="#CD853F"
                    trackColor="#2D241E"
                    textColor="#F5F0E1"
                    showPercentage={true}
                  />
                  <View className="items-center mt-3">
                      <Text className="text-[10px] font-bold text-[#DCCBB5]/60 tracking-widest uppercase mb-1">ORUÇ İLERLEMESİ</Text>
                      <Text className="text-2xl font-bold text-white">{debts.fasting.toLocaleString()}</Text>
                      <Text className="text-[10px] text-[#DCCBB5]/40 mt-1">Kalan İbadet</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick Actions (Kaza Kaydı) */}
              <View className="mb-8">
                <Text className="text-lg font-bold tracking-tight text-white mb-4">Kaza Kaydı</Text>
                <View className="flex-row gap-4">
                  <TouchableOpacity className="flex-1 flex-col items-center justify-center gap-2 bg-[#4A3D35]/60 border border-white/5 p-4 rounded-xl"
                    onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'prayer' }})} // Route to history prayer tab
                  >
                    <View className="w-10 h-10 rounded-full bg-[#CD853F]/10 items-center justify-center">
                      <History size={24} color="#CD853F" />
                    </View>
                    <Text className="text-sm font-semibold text-[#F5F0E1]">Kaza Namazı</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 flex-col items-center justify-center gap-2 bg-[#4A3D35]/60 border border-white/5 p-4 rounded-xl"
                    onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'fasting' }})} // Route to history fasting tab
                  >
                    <View className="w-10 h-10 rounded-full bg-[#DCCBB5]/10 items-center justify-center">
                      <MoonStar size={24} color="#DCCBB5" />
                    </View>
                    <Text className="text-sm font-semibold text-[#F5F0E1]">Kaza Orucu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </View>

              {/* Today Section (Outside main padding) */}
              <View className="pb-8">
                <View className="px-5 flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-bold tracking-tight text-white">Bugün</Text>
                  <View className="flex-row gap-1">
                     {prayers.map((_, index) => (
                        <View 
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full ${currentPrayerIndex === index ? 'bg-[#CD853F]' : 'bg-white/10'}`} 
                        />
                     ))}
                  </View>
                </View>

                {/* Single Card for Today (Swiper Logic Integrated) */}
                <View>
                  <FlatList
                    ref={flatListRef}
                    data={prayers}
                    horizontal
                    pagingEnabled={true}
                    decelerationRate="fast"
                    snapToInterval={SCREEN_WIDTH}
                    snapToAlignment="start"
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key}
                    onMomentumScrollEnd={(ev) => {
                        const newIndex = Math.round(ev.nativeEvent.contentOffset.x / SCREEN_WIDTH); 
                        setCurrentPrayerIndex(newIndex);
                    }}
                    getItemLayout={(data, index) => (
                        { length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }
                    )}
                    renderItem={({ item, index }) => {
                        const prayerTime = prayerTimes ? 
                            [prayerTimes.fajr, prayerTimes.dhuhr, prayerTimes.asr, prayerTimes.maghrib, prayerTimes.isha][index] 
                            : null;
                        
                        // Next time logic
                        const nextIndex = index < 4 ? index + 1 : 0;
                        const nextPrayerTimeForCard = prayerTimes ?
                             [prayerTimes.fajr, prayerTimes.dhuhr, prayerTimes.asr, prayerTimes.maghrib, prayerTimes.isha][nextIndex]
                             : null;
                        
                        const timeRemaining = nextPrayerTimeForCard ? getTimeRemaining(nextPrayerTimeForCard) : '--:--';

                        const isCompleted = dailyStatus[item.key] === 'completed';
                        const isMissed = dailyStatus[item.key] === 'missed';

                        return (
                            <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
                                <View className="bg-[#4A3D35] p-6 rounded-3xl border border-white/5 shadow-sm mb-4">
                                    <View className="flex-row items-center justify-between mb-6">
                                        <View className="flex-row items-center gap-4">
                                            <View className="w-14 h-14 rounded-full bg-[#CD853F]/10 items-center justify-center border border-[#CD853F]/20">
                                                {item.icon}
                                            </View>
                                            <View>
                                                <Text className="text-xs text-[#DCCBB5]/60 font-medium mb-1">Sıradaki Vakit</Text>
                                                <Text className="font-bold text-xl text-[#F5F0E1]">{item.label} Namazı</Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                             <Text className="text-xs text-[#DCCBB5]/60 font-medium mb-1">Kalan Süre</Text>
                                             <Text className="font-bold text-xl text-[#CD853F]">{timeRemaining}</Text>
                                        </View>
                                    </View>
                                    
                                    <View className="flex-row gap-4">
                                        <TouchableOpacity
                                            onPress={() => handlePrayerAction(item.key, 'completed')}
                                            activeOpacity={0.8}
                                            disabled={isCompleted}
                                            className={`flex-1 py-4 rounded-full flex-row items-center justify-center gap-2 shadow-lg ${
                                                isCompleted 
                                                ? 'bg-[#CD853F] shadow-[#CD853F]/20 opacity-100' 
                                                : isMissed 
                                                    ? 'bg-[#CD853F]/20 opacity-50' 
                                                    : 'bg-[#CD853F] shadow-[#CD853F]/20'
                                            }`}
                                        >
                                            {isCompleted && <Check size={20} color="white" strokeWidth={3} />}
                                            <Text className={`font-bold text-base ${isCompleted ? 'text-white' : 'text-white'}`}>
                                                {isCompleted ? 'Kılındı' : 'Kıldım'}
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            onPress={() => handlePrayerAction(item.key, 'missed')}
                                            activeOpacity={0.8}
                                            disabled={isMissed}
                                            className={`flex-1 py-4 rounded-full flex-row items-center justify-center gap-2 ${
                                                isMissed 
                                                ? 'bg-[#4A3D35] border border-white/10' 
                                                : isCompleted 
                                                    ? 'bg-white/5 opacity-50' 
                                                    : 'bg-white/5'
                                            }`}
                                        >
                                            {isMissed && <X size={20} color="#DCCBB5" strokeWidth={3} />}
                                            <Text className={`font-bold text-base ${isMissed ? 'text-[#DCCBB5]' : 'text-[#DCCBB5]/80'}`}>
                                                {isMissed ? 'Kılınmadı' : 'Kılmadım'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                  />
                </View>

              </View>

          </ScrollView>
        </SafeAreaView>
    </View>
  );
}
