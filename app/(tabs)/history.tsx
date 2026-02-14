import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, getYear, setYear, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Minus, Plus, Calendar, RotateCcw, Info, Utensils, Award, MoonStar } from 'lucide-react-native';
import { getDailyStatus, toggleDailyStatus, getMonthlyStats, initDB, quickUpdateKaza } from '../../db';
import { SyncService } from '@/services/SyncService';
import CustomAlert from '../../components/CustomAlert';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = (SCREEN_WIDTH - 60) / 7;

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'fasting' | 'kefaret_fasting';

interface PrayerType {
    key: PrayerKey;
    label: string;
}

const PRAYER_TYPES: PrayerType[] = [
    { key: 'fajr', label: 'Sabah' },
    { key: 'dhuhr', label: 'Öğle' },
    { key: 'asr', label: 'İkindi' },
    { key: 'maghrib', label: 'Akşam' },
    { key: 'isha', label: 'Yatsı' },
];

interface DailyStatus {
    [key: string]: boolean | string | undefined; // dynamic keys for prayer types
    completed?: boolean;
    note?: string;
}

interface MonthData {
    [date: string]: DailyStatus;
}

interface KefaretData {
    [date: string]: boolean;
}

interface SessionCounts {
    [key: string]: number;
}

export default function HistoryScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'prayer' | 'fasting'>('prayer');
    const [monthData, setMonthData] = useState<MonthData>({});
    const [kefaretData, setKefaretData] = useState<KefaretData>({});
    const [sessionCounts, setSessionCounts] = useState<SessionCounts>({});
    const [unsavedChanges, setUnsavedChanges] = useState<Map<string, boolean>>(new Map());
    
    // Swipe gesture refs (using ref instead of state for immediate updates)
    const touchStartX = useRef<number>(0);

    // Custom alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        type: 'success' | 'danger' | 'info' | 'warning';
        title: string;
        message: string;
    }>({ type: 'info', title: '', message: '' });

    // Generate years for selector
    const currentYear = getYear(new Date());
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    useFocusEffect(
        React.useCallback(() => {
            initDB();
            fetchMonthData();
            fetchSessionCounts();
        }, [viewDate, activeTab])
    );

    // Fetch session counts for quick entry
    const fetchSessionCounts = async () => {
        // This would ideally come from a separate DB query or aggregated from daily statuses
        // For now, we'll keep the local state counter logic but in a real app this should reflect DB state
        // We'll initialize with 0
        const counts: SessionCounts = {};
        PRAYER_TYPES.forEach(t => counts[t.key] = 0);
        counts['fasting'] = 0;
        counts['kefaret_fasting'] = 0;
        setSessionCounts(counts);
    };

    const fetchMonthData = async () => {
        try {
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const result = await getDailyStatus(start, end);
            
            const data: MonthData = {};
            const kefaret: KefaretData = {};
            
            result.forEach((row: any) => {
                if (!data[row.date]) data[row.date] = {};
                
                if (row.type === 'kefaret_fasting') {
                    // Store kefaret status separately or in a specific way
                    kefaret[row.date] = row.status === 'completed';
                } else if (activeTab === 'prayer' && row.type !== 'fasting'&& row.type !== 'kefaret_fasting') {
                     // @ts-ignore - dynamic assignment
                     data[row.date][row.type] = row.status === 'completed';
                } else if (activeTab === 'fasting' && row.type === 'fasting') {
                     data[row.date].completed = row.status === 'completed';
                     data[row.date].note = row.note;
                }
            });
            setMonthData(data);
            setKefaretData(kefaret);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleStatus = async (date: Date, type: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        if (type === 'kefaret_fasting') {
            const currentStatus = kefaretData[dateStr] || false;
            setKefaretData(prev => ({ ...prev, [dateStr]: !currentStatus }));
            setUnsavedChanges(prev => {
                const newMap = new Map(prev);
                newMap.set(`${dateStr}-${type}`, !currentStatus);
                return newMap;
            });
            return;
        }

        const isCompleted = type === 'completed' 
            ? monthData[dateStr]?.completed 
            : monthData[dateStr]?.[type];

        setMonthData(prev => ({
            ...prev,
            [dateStr]: {
                ...prev[dateStr],
                [type === 'completed' ? 'completed' : type]: !isCompleted
            }
        }));

        setUnsavedChanges(prev => {
            const newMap = new Map(prev);
            newMap.set(`${dateStr}-${type}`, !isCompleted);
            return newMap;
        });
    };

    const handleSave = async () => {
        try {
            // 1. Process Calendar Changes (Daily Status)
            for (const [key, value] of unsavedChanges) {
                if (key.endsWith('-note')) continue; // Skip notes for now

                const lastHyphenIndex = key.lastIndexOf('-');
                const dateStr = key.substring(0, lastHyphenIndex);
                const type = key.substring(lastHyphenIndex + 1);
                await toggleDailyStatus(dateStr, type, value ? 'completed' : 'pending');
            }
            
            // 2. Process Quick Entry (Kaza Debts)
            const debtUpdates = Object.entries(sessionCounts).filter(([_, count]) => count !== 0);
            if (debtUpdates.length > 0) {
                for (const [type, count] of debtUpdates) {
                    await quickUpdateKaza(type, -count); // Negative count means adding debt (UI: - button adds debt)
                    // Wait, UI:
                    // Minus button (-1) -> sessionCounts decreases.
                    // Plus button (+1) -> sessionCounts increases.
                    // Logic:
                    // If user clicks "-", they are adding a missed prayer (Debt increases).
                    // If user clicks "+", they are performing a kaza (Debt decreases).
                    
                    // Let's re-read UI text: 
                    // "Hızlı giriş ile borç ekleyebilir (-) veya yanlış girişleri düzeltebilirsiniz (+)."
                    // "Örnek: 5 gün borç eklemek için -5, 5 gün tamamladıysanız +5 girin."
                    
                    // DB `debt_counts` stores positive integer for debt.
                    // If UI is -5 (Debt increased), we need to ADD 5 to DB count.
                    // If UI is +5 (Debt decreased/Paid), we need to SUBTRACT 5 from DB count.
                    
                    // So `quickUpdateKaza` takes (type, amount).
                    // amount is added to current count.
                    // If UI is -5 -> We want query: count = count + 5. So pass +5.
                    // If UI is +5 -> We want query: count = count - 5. So pass -5.
                    
                    // So we pass: -count.
                    // Example: UI = -5. Pass -(-5) = +5. DB adds 5. Correct.
                    // Example: UI = +5. Pass -(5) = -5. DB subtracts 5. Correct.
                }
            }

            // Sync after all changes
            SyncService.backupData();

            // Reset state
            setUnsavedChanges(new Map());
            setSessionCounts(prev => {
                const reset: SessionCounts = {};
                Object.keys(prev).forEach(k => reset[k] = 0);
                return reset;
            });

            setAlertConfig({
                type: 'success',
                title: 'Başarılı',
                message: 'Değişiklikler ve kaza borçları kaydedildi'
            });
            setAlertVisible(true);
        } catch (e) {
            console.error(e);
            setAlertConfig({
                type: 'danger',
                title: 'Hata',
                message: 'Kaydetme sırasında bir hata oluştu'
            });
            setAlertVisible(true);
        }
    };

    const handleQuickUpdate = async (type: string, change: number) => {
        const currentCount = sessionCounts[type] || 0;
        const newCount = currentCount + change; // Removed Math.max(0) to allow negatives
        
        if(newCount !== currentCount) {
             setSessionCounts(prev => ({...prev, [type]: newCount}));
             // In a real scenario, this would likely update Kaza debt in DB directly
             // For now we just simulate the UI counter
        }
    };

    // Swipe gesture handlers
    const handleTouchStart = (e: any) => {
        touchStartX.current = e.nativeEvent.pageX;
    };

    const handleTouchEnd = (e: any) => {
        const endX = e.nativeEvent.pageX;
        const minSwipeDistance = 30; // Reduced for better sensitivity
        const distance = touchStartX.current - endX;
        
        if (Math.abs(distance) > minSwipeDistance) {
            if (distance > 0) {
                // Swiped left - go to next month
                setViewDate(addMonths(viewDate, 1));
            } else {
                // Swiped right - go to previous month
                setViewDate(subMonths(viewDate, 1));
            }
        }
    };

    const renderCalendar = () => {
        const start = startOfMonth(viewDate);
        const end = endOfMonth(viewDate);
        const days = eachDayOfInterval({ start, end });
        
        // Add empty days for padding at start
        const startDay = getDay(start); // 0 = Sunday
        const padding = startDay === 0 ? 6 : startDay - 1; // Mon = 0
        const paddedDays = Array(padding).fill(null).concat(days);

        return (
            <View 
                style={styles.calendarGrid}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {paddedDays.map((day, index) => {
                    if (!day) return <View key={`pad-${index}`} style={{ width: DAY_SIZE, height: 60 }} />;

                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const isFutureDate = isFuture(day);
                    
                     return (
                        <TouchableOpacity 
                            key={dateStr}
                            onPress={() => !isFutureDate && setSelectedDate(day)}
                            style={{ width: DAY_SIZE, height: 60 }} // Fixed height for consistent grid
                            className={`items-center justify-start py-1 relative ${isSelected ? '' : ''}`}
                            disabled={isFutureDate}
                        >
                            {isSelected ? (
                                <View className="bg-primary-terracotta rounded-xl px-2.5 py-1 pt-1.5 shadow-lg scale-110 z-10 items-center justify-center">
                                    <Text className="text-sm font-bold text-beige">{format(day, 'd')}</Text>
                                    <View className="flex-row gap-[2px] mt-1">
                                        {activeTab === 'prayer' ? (
                                            PRAYER_TYPES.map((t, i) => {
                                                const isDone = monthData[dateStr]?.[t.key];
                                                return (
                                                    <View 
                                                        key={i} 
                                                        className="w-1 h-1 rounded-full"
                                                        style={{ backgroundColor: isDone ? 'rgba(245, 240, 225, 0.9)' : 'rgba(245, 240, 225, 0.3)' }}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: monthData[dateStr]?.completed ? 'rgba(245, 240, 225, 0.9)' : 'rgba(245, 240, 225, 0.3)' }} />
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <Text className="text-sm font-medium" style={{ color: isFutureDate ? 'rgba(6, 78, 59, 0.2)' : '#064e3b' }}>
                                        {format(day, 'd')}
                                    </Text>
                                    
                            {/* Prayer Dots or Fasting Dot */}
                                    <View className="flex-row gap-[2px] mt-1">
                                        {activeTab === 'prayer' ? (
                                             PRAYER_TYPES.map((t, i) => {
                                                 const isDone = monthData[dateStr]?.[t.key];
                                                 return (
                                                     <View 
                                                         key={i} 
                                                         className="w-1 h-1 rounded-full"
                                                         style={{ backgroundColor: isDone ? '#CD853F' : 'rgba(6, 78, 59, 0.1)' }}
                                                     />
                                                 );
                                             })
                                        ) : (
                                             // Fasting: Single Dot
                                             <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: monthData[dateStr]?.completed ? '#CD853F' : 'rgba(6, 78, 59, 0.1)' }} />
                                        )}
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-emerald-deep">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 bg-emerald-deep/95 border-b border-white/10">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={router.back} className="p-2 -ml-2 rounded-full">
                            <ChevronLeft color="#F5F0E1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-beige tracking-tight">Borcu Düzenle</Text>
                    </View>
                    <TouchableOpacity onPress={handleSave}>
                        <Text className="text-primary-terracotta font-semibold text-sm">Kaydet</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Category Selection */}
                    <View className="px-4 pt-4">
                        <Text className="text-xs font-semibold text-beige/60 uppercase tracking-widest mb-4 ml-1">KATEGORİ SEÇİMİ</Text>
                        <View className="grid grid-cols-2 flex-row gap-3">
                            <TouchableOpacity 
                                onPress={() => setActiveTab('prayer')}
                                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border"
                                style={{
                                    backgroundColor: activeTab === 'prayer' ? '#CD853F' : '#065F46',
                                    borderColor: activeTab === 'prayer' ? 'rgba(205, 133, 63, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    shadowColor: activeTab === 'prayer' ? '#000' : 'transparent',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: activeTab === 'prayer' ? 0.3 : 0,
                                    shadowRadius: activeTab === 'prayer' ? 8 : 0,
                                    elevation: activeTab === 'prayer' ? 8 : 0,
                                }}
                            >
                                {/* We don't have filled variants in standard Lucide, using normal */}
                                <View className="rotate-0">
                                     <View className="w-5 h-3 border-2 border-beige rounded-sm mb-[2px]" /> 
                                     <View className="w-3 h-3 bg-beige rounded-full absolute -top-1 left-1" />
                                </View>
                                <Text className="font-bold" style={{ color: activeTab === 'prayer' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>Namaz</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => setActiveTab('fasting')}
                                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border"
                                style={{
                                    backgroundColor: activeTab === 'fasting' ? '#CD853F' : '#065F46',
                                    borderColor: activeTab === 'fasting' ? 'rgba(205, 133, 63, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    shadowColor: activeTab === 'fasting' ? '#000' : 'transparent',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: activeTab === 'fasting' ? 0.3 : 0,
                                    shadowRadius: activeTab === 'fasting' ? 8 : 0,
                                    elevation: activeTab === 'fasting' ? 8 : 0,
                                }}
                            >
                                <MoonStar size={18} color={activeTab === 'fasting' ? "#F5F0E1" : "rgba(245, 240, 225, 0.6)"} />
                                <Text className="font-bold" style={{ color: activeTab === 'fasting' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>Oruç</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Year Selector */}
                    <View className="flex-row justify-center items-center gap-8 mt-4 mb-0 px-8 py-2">
                         {years.filter(y => Math.abs(y - getYear(viewDate)) <= 1).map(year => (
                             <TouchableOpacity 
                                key={year} 
                                onPress={() => setViewDate(setYear(viewDate, year))}
                                className="items-center justify-center"
                                style={{
                                    borderBottomWidth: getYear(viewDate) === year ? 2 : 0,
                                    borderBottomColor: '#CD853F',
                                    paddingBottom: getYear(viewDate) === year ? 4 : 0,
                                }}
                             >
                                 <Text 
                                    className="font-bold"
                                    style={{
                                        fontSize: getYear(viewDate) === year ? 20 : 14,
                                        color: getYear(viewDate) === year ? '#F5F0E1' : 'rgba(245, 240, 225, 0.4)',
                                        paddingHorizontal: getYear(viewDate) === year ? 16 : 0,
                                    }}
                                 >
                                     {year}
                                 </Text>
                             </TouchableOpacity>
                         ))}
                    </View>

                    {/* Month Navigator */}
                    <View className="flex-row items-center justify-between px-6 py-4 mb-0">
                        <TouchableOpacity onPress={() => setViewDate(subMonths(viewDate, 1))} className="w-10 h-10 items-center justify-center rounded-full bg-emerald-card border border-white/10 shadow-sm">
                            <ChevronLeft size={24} color="#CD853F" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-beige tracking-tight">
                            {format(viewDate, 'MMMM yyyy', { locale: tr })}
                        </Text>
                        <TouchableOpacity onPress={() => setViewDate(addMonths(viewDate, 1))} className="w-10 h-10 items-center justify-center rounded-full bg-emerald-card border border-white/10 shadow-sm">
                            <ChevronRight size={24} color="#CD853F" />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar Grid */}
                    <View className="px-4 mb-8">
                        <View className="bg-beige-calendar rounded-3xl p-4 shadow-xl">
                            {/* Week Days */}
                            <View className="flex-row justify-around mb-4">
                                {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map((d, i) => (
                                    <Text key={i} style={{ width: DAY_SIZE }} className="text-center text-[10px] font-bold text-emerald-deep/40">
                                        {d}
                                    </Text>
                                ))}
                            </View>
                            
                            {renderCalendar()}
                        </View>
                    </View>

                    {/* Selected Day View */}
                    <View className="px-4 mb-6">
                        <View className="bg-emerald-card rounded-[2rem] p-6 border border-white/5 shadow-xl">
                            <View className="flex-row items-center justify-between mb-8">
                                <View className="flex-row items-center gap-4">
                                     <View className="w-12 h-12 bg-primary-terracotta rounded-full items-center justify-center shadow-md">
                                         <Text className="text-beige font-bold text-lg">{format(selectedDate, 'd')}</Text>
                                     </View>
                                     <Text className="text-beige font-bold text-lg tracking-tight">{format(selectedDate, 'd MMMM EEEE', { locale: tr })}</Text>
                                </View>
                                <Text className="text-[10px] font-bold text-primary-terracotta tracking-widest uppercase">SEÇİLİ GÜN</Text>
                            </View>

                            {/* Grid or List based on Tab */}
                            <View>
                                {activeTab === 'prayer' ? (
                                    <View className="flex-row justify-between gap-3">
                                    {PRAYER_TYPES.map(t => {
                                        const isDone = monthData[format(selectedDate, 'yyyy-MM-dd')]?.[t.key];
                                        return (
                                            <View key={t.key} className="flex-col items-center gap-2 flex-1">
                                                <Text className="text-[10px] font-medium text-beige/60">{t.label}</Text>
                                                <TouchableOpacity 
                                                    onPress={() => toggleStatus(selectedDate, t.key)}
                                                    className="w-full aspect-square rounded-full items-center justify-center border"
                                                    style={{
                                                        backgroundColor: isDone ? '#CD853F' : 'rgba(6, 78, 59, 0.4)',
                                                        borderColor: isDone ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                                                    }}
                                                >
                                                    {isDone && <Check size={28} color="#F5F0E1" strokeWidth={3} />}
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    })}
                                    </View>
                                ) : (
                                    // Fasting View - Toggles
                                    <View className="gap-4">
                                        <View className="flex-row items-center justify-between bg-emerald-deep/30 p-4 rounded-2xl border border-white/5">
                                            <View className="flex-row items-center gap-3">
                                                <Utensils size={20} color="#CD853F" />
                                                <Text className="text-sm font-semibold text-beige">Oruç Tutuldu</Text>
                                            </View>
                                            <Switch 
                                                value={!!monthData[format(selectedDate, 'yyyy-MM-dd')]?.completed}
                                                onValueChange={() => toggleStatus(selectedDate, 'completed')}
                                                trackColor={{ false: '#767577', true: '#CD853F' }}
                                                thumbColor={'#F5F0E1'}
                                                ios_backgroundColor="#3e3e3e"
                                            />
                                        </View>

                                         <View className="flex-row items-center justify-between bg-emerald-deep/30 p-4 rounded-2xl border border-white/5">
                                            <View className="flex-row items-center gap-3">
                                                <RotateCcw size={20} color="rgba(245, 240, 225, 0.4)" />
                                                <Text className="text-sm font-semibold text-beige">Kefaret Orucu Tutuldu</Text>
                                            </View>
                                            <Switch 
                                                value={!!kefaretData[format(selectedDate, 'yyyy-MM-dd')]}
                                                onValueChange={() => toggleStatus(selectedDate, 'kefaret_fasting')}
                                                trackColor={{ false: '#767577', true: '#CD853F' }}
                                                thumbColor={'#F5F0E1'}
                                                ios_backgroundColor="#3e3e3e"
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Quick Entry Section */}
                    <View className="px-4 mb-6">
                        <Text className="text-xs font-semibold text-beige/60 uppercase tracking-widest mb-4 ml-1">HIZLI KAZA GİRİŞİ</Text>
                        <View className="bg-emerald-card rounded-[2rem] p-5 border border-white/5 gap-4">
                            { (activeTab === 'prayer' ? PRAYER_TYPES : [
                                {key: 'fasting', label: 'Kaza Orucu'}, 
                                {key: 'kefaret_fasting', label: 'Kefaret Orucu'}
                            ]).map((type) => (
                                <View key={type.key} className="flex-row items-center justify-between bg-emerald-deep/40 rounded-2xl p-3 border border-white/5">
                                    <Text className="text-sm font-semibold text-beige ml-1">{type.label}</Text>
                                    <View className="flex-row items-center gap-4">
                                        <TouchableOpacity 
                                            onPress={() => handleQuickUpdate(type.key, -1)}
                                            className="w-10 h-10 rounded-full bg-emerald-deep border border-white/10 flex items-center justify-center"
                                        >
                                            <Minus size={18} color="#F5F0E1" />
                                        </TouchableOpacity>
                                        
                                        <Text className="w-6 text-center text-lg font-bold text-primary-terracotta">
                                            {sessionCounts[type.key] || 0}
                                        </Text>

                                        <TouchableOpacity 
                                            onPress={() => handleQuickUpdate(type.key, 1)}
                                            className="w-10 h-10 rounded-full bg-primary-terracotta flex items-center justify-center shadow-lg"
                                        >
                                            <Plus size={18} color="#F5F0E1" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View className="px-4 pb-12">
                        <View className="bg-primary-terracotta/20 rounded-2xl p-5 border border-primary-terracotta/30 flex-row gap-4 items-start mb-6">
                            <Info size={20} color="#CD853F" style={{ marginTop: 4 }} />
                            <Text className="text-xs leading-relaxed text-beige/90 flex-1">
                                Hızlı giriş ile borç ekleyebilir (-) veya yanlış girişleri düzeltebilirsiniz (+). Örnek: 5 gün borç eklemek için -5, 5 gün tamamladıysanız +5 girin.
                            </Text>
                        </View>
                        
                        <Text className="text-xs text-beige/40 text-center leading-relaxed px-4">
                            Not: Buluğ çağı başlangıç tarihinizi ve diğer hesaplama parametrelerini Profil → Kişisel Bilgiler ekranından düzenleyebilirsiniz.
                        </Text>
                    </View>

                </ScrollView>
                
                {/* Custom Alert */}
                <CustomAlert
                    visible={alertVisible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    onConfirm={() => setAlertVisible(false)}
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});
