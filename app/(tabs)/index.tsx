import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, Platform, Alert } from "react-native";
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { getDebtCounts, getDb } from "@/db";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next'; // Import useTranslation
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
    Activity,
    Info
} from 'lucide-react-native';
import { CalculationMethod, PrayerTimes, Coordinates } from 'adhan';
import Svg, { Path } from 'react-native-svg';
import { SyncService } from '@/services/SyncService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

import CustomAlert from '@/components/CustomAlert';

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation(); // Hook
  
  // State
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [dailyStatus, setDailyStatus] = useState<{ [key: string]: 'completed' | 'missed' | null }>({});
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--:--');
  const [nextPrayerKey, setNextPrayerKey] = useState<string>('fajr'); // Changed to key
  const [coords, setCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [debts, setDebts] = useState<{ totalPrayer: number, fasting: number }>({ totalPrayer: 0, fasting: 0 }); 
  const [locationName, setLocationName] = useState('İstanbul'); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [effDate, setEffDate] = useState<Date>(new Date());

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
      type: 'success' | 'danger' | 'info' | 'warning';
      title: string;
      message: string;
  }>({ type: 'info', title: '', message: '' });
  
  const [hasUnread, setHasUnread] = useState(false);

  const checkUnreadStatus = async () => {
      try {
          // 1. Get Last Read Date
          const lastReadStr = await AsyncStorage.getItem('last_notification_read_date');
          const lastRead = lastReadStr ? new Date(lastReadStr) : new Date(0);

          let unreadFound = false;

          // 2. Check General Notifications (from Background Service cache)
          const latestGeneralStr = await AsyncStorage.getItem('latest_general_notification_date');
          if (latestGeneralStr) {
              const latestGeneral = new Date(latestGeneralStr);
              if (latestGeneral > lastRead) unreadFound = true;
          }

          // 3. Check Prayer Notifications (Local)
          // We check if the most recent passed prayer is > lastRead
          // We can use the 'prayerTimes' state if available, or calc local
          if (!unreadFound && prayerTimes) {
               const now = new Date();
               const passedPrayers = [
                   prayerTimes.fajr,
                   prayerTimes.dhuhr, 
                   prayerTimes.asr,
                   prayerTimes.maghrib,
                   prayerTimes.isha
               ].filter(t => t < now);
               
               if (passedPrayers.length > 0) {
                   const lastPassed = passedPrayers[passedPrayers.length - 1];
                   if (lastPassed > lastRead) unreadFound = true;
               }
          }
          
          setHasUnread(unreadFound);

      } catch (e) { console.log('Badge check error', e); }
  };
  
  // Check periodically or on focus
  useFocusEffect(
      useCallback(() => {
          checkUnreadStatus();
      }, [prayerTimes]) // Re-check when prayerTimes updates (which happens on mount/calc)
  );

  const prayers: { key: PrayerKey; label: string }[] = [
    { key: 'fajr', label: 'fajr' },
    { key: 'dhuhr', label: 'dhuhr' },
    { key: 'asr', label: 'asr' },
    { key: 'maghrib', label: 'maghrib' },
    { key: 'isha', label: 'isha' },
  ];

  // Helper Functions
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

  const getFormatTime = (prayerTime: Date) => {
      const hours = prayerTime.getHours().toString().padStart(2, '0');
      const minutes = prayerTime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
  }

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

  const fetchDailyStatus = async (date: Date) => {
    try {
        const db = getDb();
        const dateStr = format(date, 'yyyy-MM-dd'); // Use passed date
        const result: any[] = await db.getAllAsync('SELECT * FROM daily_status WHERE date = ?', [dateStr]);
        const statusMap: any = {};
        result.forEach((row: any) => statusMap[row.type] = row.status);
        setDailyStatus(statusMap);
    } catch (e) { console.error(e); }
  };

  const calculatePrayerTimes = (coordinates?: { latitude: number, longitude: number }) => {
    const latitude = coordinates ? coordinates.latitude : 41.0082;
    const longitude = coordinates ? coordinates.longitude : 28.9784;
    
    if (coordinates) {
        setCoords(coordinates);
    }
    
    const adhanCoordinates = new Coordinates(latitude, longitude);
    const params = CalculationMethod.Turkey();
    
    // Determine Effective Date
    // If now < Today's Fajr, then effective date is Yesterday
    const now = new Date();
    let tempTimes = new PrayerTimes(adhanCoordinates, now, params);
    
    let effectiveDate = now;
    if (now < tempTimes.fajr) {
        effectiveDate = new Date(now);
        effectiveDate.setDate(now.getDate() - 1);
    }

    setEffDate(effectiveDate); // Store effective date

    const times = new PrayerTimes(adhanCoordinates, effectiveDate, params);
    setPrayerTimes(times);
    updateCurrentIndex(times);
    updateCountdown(times); // Initial update
    fetchDailyStatus(effectiveDate); // Fetch status for effective date
  };
 
  const updateCountdown = (times: PrayerTimes) => {
    const now = new Date();
    
    // Check if we need to shift day (e.g. passed Fajr of effective day + 1)
    // If our effective date is T, and now > T+1 Fajr, we should recalculate
    const nextDay = new Date(times.date);
    nextDay.setDate(times.date.getDate() + 1);
    
    // Re-calc next day fajr to check boundary
    const params = CalculationMethod.Turkey();
    const nextTimes = new PrayerTimes(times.coordinates, nextDay, params);

    if (now >= nextTimes.fajr) {
         if (coords) {
            calculatePrayerTimes(coords);
            return; 
        }
    }

    let nextPrayerTime: Date | null = null;
    let nextKey = '';

    if (now < times.fajr) { nextPrayerTime = times.fajr; nextKey = 'fajr'; }
    else if (now < times.dhuhr) { nextPrayerTime = times.dhuhr; nextKey = 'dhuhr'; }
    else if (now < times.asr) { nextPrayerTime = times.asr; nextKey = 'asr'; }
    else if (now < times.maghrib) { nextPrayerTime = times.maghrib; nextKey = 'maghrib'; }
    else if (now < times.isha) { nextPrayerTime = times.isha; nextKey = 'isha'; }
    else {
        // Next is Fajr of tomorrow (relative to effective date)
        nextPrayerTime = nextTimes.fajr;
        nextKey = 'fajr';
    }

    if (nextPrayerTime) {
        const diff = nextPrayerTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setNextPrayerKey(nextKey);
    }
  };

  const loadDebts = async () => {
      try {
          const { syncDebts } = require('@/db');
          await syncDebts(); 
          const counts = await getDebtCounts();
          setDebts({ totalPrayer: counts.prayerDebt, fasting: counts.fastingDebt });
      } catch (e) {
          console.error('Error loading debts:', e);
      }
  };

  const handlePrayerAction = async (prayerKey: string, action: 'completed' | 'missed' | 'pending') => {
    try {
        const db = getDb();
        const { toggleDailyStatus } = require('@/db');
        const dateStr = format(effDate, 'yyyy-MM-dd'); // Use effective date
        
        setDailyStatus(prev => {
            const newState = { ...prev };
            if (action === 'pending') {
                delete newState[prayerKey];
            } else {
                newState[prayerKey] = action;
            }
            return newState;
        });

        await toggleDailyStatus(dateStr, prayerKey, action);
        SyncService.backupData();
    } catch (e) { console.error(e); }
  };

  const showDebtInfo = () => {
        setAlertConfig({
            type: 'info',
            title: t('debt.title'),
            message: t('debt.info_message', { total: debts.totalPrayer })
        });
        setAlertVisible(true);
  };

  // Effects
  useFocusEffect(
      useCallback(() => {
          loadDebts();
          fetchDailyStatus(effDate);
      }, [effDate])
  );

  useEffect(() => {
      (async () => {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
              setErrorMsg(t('dashboard.location_denied'));
              calculatePrayerTimes();
              return;
          }

          try {
            let location = await Location.getCurrentPositionAsync({});
            try {
                let reverseGeocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                if (reverseGeocode && reverseGeocode.length > 0) {
                    const city = reverseGeocode[0].city || reverseGeocode[0].subregion || 'Konum';
                    setLocationName(city);
                }
            } catch (e) { console.log('Reverse geocode error', e); }
            
            calculatePrayerTimes(location.coords);
          } catch (e) {
              console.error("Location error:", e);
              calculatePrayerTimes();
          }
      })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { if (prayerTimes) updateCountdown(prayerTimes); }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes, coords]);

  const currentPrayerKey = prayers[currentPrayerIndex].key;
  const isCompleted = dailyStatus[currentPrayerKey] === 'completed';
  const isMissed = dailyStatus[currentPrayerKey] === 'missed';

  const PRAYER_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 5;

  return (
    <View className="flex-1 bg-[#F8FAFC]">
        {/* HEADER SECTION (Curved) */}
        <View className="bg-emerald-deep pb-24 relative z-10">
            <SafeAreaView edges={['top']}>
                {/* Top Bar */}
                <View className="px-6 flex-row justify-between items-center mb-6 pt-2">
                    <View>
                        <Text className="text-emerald-100/70 font-medium text-xs tracking-widest uppercase">
                            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-1">
                            <MapPin size={14} color="#D2691E" />
                            <Text className="text-white font-bold text-sm">{locationName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        onPress={() => router.push('/notifications')}
                        className="bg-white/10 p-2 rounded-full relative"
                    >
                        <Bell size={20} color="white" />
                        {hasUnread && (
                            <View className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-emerald-900" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Time Display */}
                <View className="items-center justify-center mb-6">
                <View className="flex-row items-center gap-2 mb-1">
                     <Moon size={20} color="#D2691E" />
                     <Text className="text-emerald-100/90 font-medium text-lg">
                        {t('dashboard.to_prayer', { prayer: t(`prayers.${nextPrayerKey}`) })}
                     </Text>
                </View>
                
                <Text className="text-7xl font-black text-white tracking-tighter leading-none">{timeRemaining}</Text>
                <View className="bg-white/10 px-4 py-1.5 rounded-full mt-3 backdrop-blur-sm">
                    <Text className="text-emerald-50 text-xs font-medium tracking-wide">{t('dashboard.next_prayer_remaining')}</Text>
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
                         subText = `${t('prayers.sunny')}: ${sunriseStr}`;
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
                            <Text className={`text-[10px] font-bold mb-0.5 ${isActive ? 'text-white' : 'text-emerald-100'}`} numberOfLines={1}>{t(`prayers.${prayer.key}`)}</Text>
                            <Text className={`text-[10px] ${isActive ? 'text-white' : 'text-emerald-100/80'}`}>{timeStr}</Text>
                             {subText && (
                                <Text className="text-[8px] text-emerald-100/60 mt-0.5 -mb-1">{subText}</Text>
                            )}
                            {status && <View className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${status === 'completed' ? 'bg-primary' : 'bg-red-500'}`} />}
                        </View>
                    );
                })}
                </View>
            </SafeAreaView>
            
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
        <ScrollView contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            
            {/* TOOLS SECTION */}
            <View className="mb-6 mt-2">
                <Text className="text-center text-emerald-deep font-bold text-lg mb-4">{t('dashboard.quick_access')}</Text>
                <View className="flex-row flex-wrap justify-center gap-4 px-4">
                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'prayer' }})}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <HistoryIcon size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">{t('dashboard.missed_prayer')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'fasting' }})}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <MoonStar size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">{t('dashboard.missed_fasting')}</Text>
                    </TouchableOpacity>

                    {/* Zikirmatik Button */}
                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push('/zikir')}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <Hash size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">{t('dashboard.dhikr')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push('/qibla')}
                    >
                        <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <Compass size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">{t('dashboard.qibla')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        className="items-center gap-2"
                        onPress={() => router.push({ pathname: '/(tabs)/settings', params: { action: 'openPrayerReminders' } })}
                    >
                         <View className="w-14 h-14 rounded-2xl bg-white border border-slate-100 items-center justify-center shadow-sm">
                            <Bell size={24} color="#D2691E" />
                        </View>
                        <Text className="text-[10px] font-semibold text-slate-600">{t('dashboard.prayer_alert')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* DAILY OVERVIEW (Replaces Action Card) */}
            <View className="px-6 mb-8 mt-4">
                 <View className="bg-emerald-deep/80 p-5 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-md">
                    <View className="flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-primary-terracotta rounded-full items-center justify-center">
                                <Text className="text-white font-bold text-lg">{new Date().getDate()}</Text>
                            </View>
                            <View>
                                <Text className="text-white font-bold text-lg">{t('dashboard.todays_worship')}</Text>
                                <Text className="text-emerald-100/60 text-xs uppercase tracking-wider">
                                    {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                        </View>
                         {/* Info Icon and Debt Info for Debt Calculation */}
                         {debts.totalPrayer > 0 && (
                            <TouchableOpacity 
                                onPress={showDebtInfo}
                                className="flex-row items-center gap-2 bg-white/10 pl-3 pr-2 py-1.5 rounded-full border border-white/5"
                            >
                                <Text className="text-[10px] text-emerald-100 font-bold">{t('debt.debt_label', { count: debts.totalPrayer })}</Text>
                                <View className="bg-emerald-deep/50 p-1 rounded-full">
                                     <Info size={10} color="#A7F3D0" />
                                </View>
                            </TouchableOpacity>
                         )}
                    </View>

                    <View className="flex-row justify-between gap-2">
                        {prayers.map((prayer, index) => {
                            const isCompleted = dailyStatus[prayer.key] === 'completed';
                            const isActiveTime = currentPrayerIndex === index;
                            
                            return (
                                <View key={prayer.key} className="flex-col items-center gap-2 flex-1">
                                    <Text className={`text-[10px] font-bold ${isActiveTime ? 'text-primary-terracotta' : 'text-beige/50'}`}>
                                        {t(`prayers.${prayer.key}`)}
                                    </Text>
                                    
                                    <TouchableOpacity 
                                        onPress={() => handlePrayerAction(prayer.key, isCompleted ? 'pending' : 'completed')}
                                        activeOpacity={0.7}
                                        className={`w-full aspect-square rounded-2xl items-center justify-center border shadow-sm ${
                                            isCompleted 
                                                ? 'bg-primary-terracotta border-primary-terracotta' 
                                                : isActiveTime 
                                                    ? 'bg-emerald-deep/60 border-primary-terracotta/50' 
                                                    : 'bg-emerald-deep/40 border-white/5'
                                        }`}
                                    >
                                        {isCompleted && <Check size={24} color="#F5F0E1" strokeWidth={3} />}
                                        {!isCompleted && isActiveTime && (
                                            <View className="w-2 h-2 rounded-full bg-primary-terracotta animate-pulse" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                 </View>
            </View>

        </ScrollView>
        


        <CustomAlert
            visible={alertVisible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            onConfirm={() => setAlertVisible(false)}
        />
    </View>
  );
}
