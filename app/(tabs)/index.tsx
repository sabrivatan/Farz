import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from "react-native";
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
// @ts-ignore
import { getDb } from "@/db";
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    MapPin, 
    Moon, 
    Sun, 
    Bell,
    Settings,
    User,
    Compass,
    Hash,
    Sunrise,
    Sunset,
    CloudSun,
    Check,
    X,
    History as HistoryIcon,
    MoonStar,
    BarChart2,
    CalendarDays,
    Activity
} from 'lucide-react-native';
import { CalculationMethod, PrayerTimes, Coordinates } from 'adhan';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export default function Dashboard() {
  const router = useRouter();
  
  // State
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [dailyStatus, setDailyStatus] = useState<{ [key: string]: 'completed' | 'missed' | null }>({});
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--:--');
  const [nextWriter, setNextWriter] = useState<string>('');
  const [debts, setDebts] = useState<any>({ fajr: 0, fasting: 0 }); 
  
  const prayers: { key: PrayerKey; label: string }[] = [
    { key: 'fajr', label: 'Sabah' },
    { key: 'dhuhr', label: 'Öğle' },
    { key: 'asr', label: 'İkindi' },
    { key: 'maghrib', label: 'Akşam' },
    { key: 'isha', label: 'Yatsı' },
  ];

  // Icons Helper
  const getIcon = (index: number, size: number, color: string) => {
      switch(index) {
          case 0: return <Sunrise size={size} color={color} />;
          case 1: return <Sun size={size} color={color} />;
          case 2: return <CloudSun size={size} color={color} />;
          case 3: return <Sunset size={size} color={color} />;
          case 4: return <Moon size={size} color={color} />;
          default: return <Sun size={size} color={color} />;
      }
  };

  useEffect(() => {
    calculatePrayerTimes();
    fetchDailyStatus();
    fetchDebts();
    const timer = setInterval(() => { if (prayerTimes) updateCountdown(prayerTimes); }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (prayerTimes) updateCountdown(prayerTimes);
  }, [prayerTimes]);

  const fetchDebts = async () => {
      try {
          const db = getDb();
          const result: any[] = await db.getAllAsync('SELECT * FROM debt_counts');
          const newDebts: any = { fajr: 0, fasting: 0 }; 
          let totalPrayer = 0;
          result.forEach((row: any) => {
              if (row.type === 'fasting') newDebts.fasting = row.count;
              else totalPrayer += row.count;
          });
          newDebts.totalPrayer = totalPrayer;
          setDebts(newDebts);
      } catch (e) { console.error(e); }
  }

  const fetchDailyStatus = async () => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        const result: any[] = await db.getAllAsync('SELECT * FROM daily_status WHERE date = ?', [today]);
        const statusMap: any = {};
        result.forEach((row: any) => statusMap[row.type] = row.status);
        setDailyStatus(statusMap);
    } catch (e) { console.error(e); }
  };

  const calculatePrayerTimes = () => {
    const coordinates = new Coordinates(41.0082, 28.9784);
    const params = CalculationMethod.Turkey();
    const date = new Date();
    const times = new PrayerTimes(coordinates, date, params);
    setPrayerTimes(times);
    updateCurrentIndex(times);
  };

  const updateCurrentIndex = (times: PrayerTimes) => {
    const now = new Date();
    let index = 0;
    if (now >= times.isha) index = 4;
    else if (now >= times.maghrib) index = 3;
    else if (now >= times.asr) index = 2;
    else if (now >= times.dhuhr) index = 1;
    else if (now >= times.fajr) index = 0;
    else index = 5; 
    if (index === 5) index = 4;
    setCurrentPrayerIndex(index);
  }

  const updateCountdown = (times: PrayerTimes) => {
    const now = new Date();
    let nextPrayerTime: Date | null = null;
    let nextPrayerName = '';

    if (now < times.fajr) { nextPrayerTime = times.fajr; nextPrayerName = 'Sabah'; }
    else if (now < times.dhuhr) { nextPrayerTime = times.dhuhr; nextPrayerName = 'Öğle'; }
    else if (now < times.asr) { nextPrayerTime = times.asr; nextPrayerName = 'İkindi'; }
    else if (now < times.maghrib) { nextPrayerTime = times.maghrib; nextPrayerName = 'Akşam'; }
    else if (now < times.isha) { nextPrayerTime = times.isha; nextPrayerName = 'Yatsı'; }
    else {
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + 1);
        const coordinates = new Coordinates(41.0082, 28.9784);
        const params = CalculationMethod.Turkey();
        const nextTimes = new PrayerTimes(coordinates, nextDay, params);
        nextPrayerTime = nextTimes.fajr;
        nextPrayerName = 'Sabah';
    }

    if (nextPrayerTime) {
        const diff = nextPrayerTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setNextWriter(nextPrayerName);
    }
  };
  
  const getFormatTime = (prayerTime: Date) => {
      const hours = prayerTime.getHours().toString().padStart(2, '0');
      const minutes = prayerTime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
  }

  const handlePrayerAction = async (prayerKey: string, action: 'completed' | 'missed') => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        setDailyStatus(prev => ({ ...prev, [prayerKey]: action }));
        await db.runAsync('INSERT OR REPLACE INTO daily_status (date, type, status) VALUES (?, ?, ?)', [today, prayerKey, action]);
    } catch (e) { console.error(e); }
  };

  const currentPrayerKey = prayers[currentPrayerIndex].key;
  const isCompleted = dailyStatus[currentPrayerKey] === 'completed';
  const isMissed = dailyStatus[currentPrayerKey] === 'missed';

  const PRAYER_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 5;

  return (
    <View className="flex-1 bg-background-light dark:bg-slate-900">
        {/* HEADER SECTION (Curved) */}
        <View className="bg-emerald-deep pt-6 pb-24 relative z-10">
            {/* Top Bar */}
            <View className="px-6 flex-row justify-between items-center mb-6">
                <View>
                    <Text className="text-emerald-100/70 font-medium text-xs tracking-widest uppercase">
                        {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-1">
                        <MapPin size={14} color="#D2691E" />
                        <Text className="text-white font-bold text-sm">İstanbul</Text>
                    </View>
                </View>
                <TouchableOpacity className="bg-white/10 p-2 rounded-full">
                    <Bell size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Time Display */}
            <View className="items-center justify-center mb-6">
                <View className="flex-row items-center gap-2 mb-1">
                     <Moon size={20} color="#D2691E" />
                     <Text className="text-emerald-100/90 font-medium text-lg">{nextWriter} Vaktine</Text>
                </View>
                
                <Text className="text-7xl font-black text-white tracking-tighter leading-none">{timeRemaining}</Text>
                <View className="bg-white/10 px-4 py-1.5 rounded-full mt-3 backdrop-blur-sm">
                    <Text className="text-emerald-50 text-xs font-medium tracking-wide">Sonraki vakte kalan süre</Text>
                </View>
            </View>

            {/* Prayer Strip (Fixed Width, No Scroll) */}
            <View className="flex-row justify-between px-6 mb-4">
                {prayers.map((prayer, index) => {
                    const time = prayerTimes && [prayerTimes.fajr, prayerTimes.dhuhr, prayerTimes.asr, prayerTimes.maghrib, prayerTimes.isha][index];
                    const timeStr = time ? getFormatTime(time) : '--:--';
                    const isActive = currentPrayerIndex === index;
                    const status = dailyStatus[prayer.key];
                    
                    let subText = null;
                    if (index === 0 && prayerTimes) {
                         const sunrise = prayerTimes.sunrise;
                         const sunriseStr = sunrise ? getFormatTime(sunrise) : '';
                         subText = `Gnş: ${sunriseStr}`;
                    }

                    return (
                        <View 
                            key={prayer.key}
                            style={{ width: PRAYER_ITEM_WIDTH - 4 }}
                            className={`items-center justify-center py-2 rounded-xl ${
                                isActive ? 'bg-white/20' : 'opacity-60'
                            }`}
                        >
                            <View className="mb-1">
                                {getIcon(index, 16, isActive ? '#FFFFFF' : '#A7F3D0')}
                            </View>
                            <Text className={`text-[10px] font-bold mb-0.5 ${isActive ? 'text-white' : 'text-emerald-100'}`} numberOfLines={1}>{prayer.label}</Text>
                            <Text className={`text-[10px] ${isActive ? 'text-white' : 'text-emerald-100/80'}`}>{timeStr}</Text>
                             {subText && (
                                <Text className="text-[8px] text-emerald-100/60 mt-0.5 -mb-1">{subText}</Text>
                            )}
                            {status && <View className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${status === 'completed' ? 'bg-primary' : 'bg-red-500'}`} />}
                        </View>
                    );
                })}
            </View>

            {/* CURVED SVG BOTTOM */}
            <View style={{ position: 'absolute', bottom: -24, left: 0, right: 0, zIndex: -1 }}>
                <Svg height="50" width={SCREEN_WIDTH} viewBox={`0 0 ${SCREEN_WIDTH} 50`}>
                    <Path
                        d={`M0 0 H${SCREEN_WIDTH} V20 Q${SCREEN_WIDTH / 2} 50 0 20 Z`} 
                        fill="#064e3b" // emerald-deep
                    />
                </Svg> 
            </View>
        </View>

        {/* FLOATING CENTRAL ICON */}
        <View className="items-center -mt-10 mb-2 z-20 relative">
             <View className="bg-background-light p-2 rounded-full shadow-sm">
                 <View className="bg-primary w-16 h-16 rounded-full items-center justify-center border-4 border-background-light shadow-xl shadow-primary/30">
                     {getIcon(currentPrayerIndex, 32, '#FFFFFF')}
                 </View>
             </View>
        </View>

        {/* BODY CONTENT */}
        <ScrollView contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            
            {/* TOOLS SECTION */}
            <View className="mb-6 mt-2">
                <Text className="px-6 text-emerald-deep font-bold text-lg mb-4">Hızlı Erişim</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'prayer' }})}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <HistoryIcon size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">Kaza Namazı</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'fasting' }})}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <MoonStar size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">Kaza Orucu</Text>
                    </TouchableOpacity>

                    {/* Zikirmatik Button */}
                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push('/zikir')}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <Hash size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">Zikirmatik</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push('/qibla')}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <Compass size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">Kıble</Text>
                    </TouchableOpacity>
                    


                    <TouchableOpacity className="items-center gap-2">
                         <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <CalendarDays size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">Takvim</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* ACTION CARD & PROGRESS SUMMARY */}
            <View className="px-6 flex-1 justify-end">
                 <View className="bg-emerald-deep p-6 rounded-3xl relative overflow-hidden mb-4 min-h-[200px] justify-between">
                    {/* Background Pattern fake */}
                    <View className="absolute inset-0 opacity-10" style={{ backgroundColor: '#000' }} />
                    
                    <View>
                        <Text className="text-emerald-200 text-xs font-medium mb-1">Vaktin geçmeden</Text>
                        <Text className="text-white text-2xl font-bold mb-4">{prayers[currentPrayerIndex]?.label} Namazı</Text>
                    </View>

                    <View className="flex-row gap-3 mb-6 items-end self-end w-full">
                        <TouchableOpacity
                            onPress={() => handlePrayerAction(currentPrayerKey, 'completed')}
                            activeOpacity={0.8}
                            disabled={isCompleted}
                            className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-black/20 ${
                                isCompleted ? 'bg-primary' : 'bg-primary'
                            }`}
                        >
                            <Check size={18} color="white" strokeWidth={3} />
                            <Text className="text-white font-bold text-sm">Kıldım</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handlePrayerAction(currentPrayerKey, 'missed')}
                            activeOpacity={0.8}
                            disabled={isMissed}
                            className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 border ${
                                isMissed ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/20'
                            }`}
                        >
                            <X size={18} color="white" strokeWidth={3} />
                            <Text className="text-white font-bold text-sm">Kılmadım</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Horizontal Progress Bars (Within Card) */}
                    <View className="border-t border-white/10 pt-4">
                        <View className="mb-3">
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Namaz Borcu</Text>
                                <Text className="text-[10px] font-bold text-white">{debts.totalPrayer || 0}</Text>
                            </View>
                            <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <View style={{ width: '45%' }} className="h-full bg-primary rounded-full" />
                            </View>
                        </View>
                        
                        <View>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Oruç Borcu</Text>
                                <Text className="text-[10px] font-bold text-white">{debts.fasting || 0}</Text>
                            </View>
                            <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <View style={{ width: '20%' }} className="h-full bg-emerald-400 rounded-full" /> 
                            </View>
                        </View>
                    </View>

                 </View>
            </View>

        </ScrollView>
    </View>
  );
}
