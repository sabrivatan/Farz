import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, TextInput, Alert, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Info, History, MoonStar, Plus, Minus } from 'lucide-react-native';
// @ts-ignore
import { getDb } from '@/db';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDaysInMonth, setDate, isSameDay, getDay, isAfter, startOfDay, getYear, setYear, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = width; 
const DAY_SIZE = (CALENDAR_WIDTH - 32) / 7;

const PRAYER_TYPES = [
    { key: 'fajr', label: 'Sabah', color: '#88B04B' }, 
    { key: 'dhuhr', label: 'Öğle', color: '#FFCC66' }, 
    { key: 'asr', label: 'İkindi', color: '#FF9966' }, 
    { key: 'maghrib', label: 'Akşam', color: '#CC6633' }, 
    { key: 'isha', label: 'Yatsı', color: '#663399' }, 
];

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function HistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const params = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState<'prayer' | 'fasting'>(
        (params.tab as 'prayer' | 'fasting') || 'prayer'
    );

    // Sync tab with params when they change (e.g. from Dashboard shortcut)
    useEffect(() => {
        if (params.tab && (params.tab === 'prayer' || params.tab === 'fasting')) {
            setActiveTab(params.tab);
        }
    }, [params.tab]);
    
    // Calendar State
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [viewDate, setViewDate] = useState(new Date()); 
    const [years, setYears] = useState<number[]>([]);
    
    // Data State
    const [monthData, setMonthData] = useState<{[date: string]: {[type: string]: boolean}}>({});
    const [unsavedChanges, setUnsavedChanges] = useState<Map<string, boolean>>(new Map());

    // Fasting additional data (reason)
    const [fastingReason, setFastingReason] = useState('');

    // Quick Entry Counter State (Session based)
    const [sessionCounts, setSessionCounts] = useState<{[key: string]: number}>({});
    // Local changes for quick entry before save
    const [quickAdjustments, setQuickAdjustments] = useState<{[key: string]: number}>({});

    // PanResponder for Swipe Gestures (Month Change)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dx, dy } = gestureState;
                return Math.abs(dx) > 20 && Math.abs(dy) < 20; // Horizontal swipe only
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) {
                    // Swipe Right -> Prev Month
                    setViewDate(prev => subMonths(prev, 1));
                } else if (gestureState.dx < -50) {
                    // Swipe Left -> Next Month
                    // Check if next month is in future? Usually allow view, disable actions.
                    setViewDate(prev => addMonths(prev, 1));
                }
            },
        })
    ).current;

    useFocusEffect(
        useCallback(() => {
            initYears();
            fetchMonthData(viewDate);
            return () => {};
        }, [viewDate, activeTab])
    );

    const initYears = () => {
        const currentYear = new Date().getFullYear();
        const y = [];
        // Show last 5 years up to current year
        for (let i = currentYear - 5; i <= currentYear; i++) {
            y.push(i);
        }
        setYears(y);
    };

    const fetchMonthData = async (date: Date) => {
        setLoading(true);
        const db = getDb();
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        
        try {
            const result: any[] = await db.getAllAsync(
                `SELECT * FROM daily_status WHERE date >= ? AND date <= ?`,
                [start, end]
            );

            const data: any = {};
            result.forEach(row => {
                if (!data[row.date]) data[row.date] = {};
                if (row.status === 'completed') {
                    data[row.date][row.type] = true;
                }
            });
            setMonthData(data);
        } catch (e) {
            console.error("Fetch history error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (unsavedChanges.size === 0 && Object.keys(quickAdjustments).length === 0) return;
        
        Alert.alert(
            "Değişiklikleri Kaydet",
            "Yaptığınız değişiklikler kaydedilsin mi? Bu işlem borç sayılarınızı güncelleyecektir.",
            [
                { text: "Vazgeç", style: 'cancel' },
                { 
                    text: "Kaydet", 
                    onPress: async () => {
                        await performSave();
                    } 
                }
            ]
        );
    };

    const performSave = async () => {
        setLoading(true);
        const db = getDb();

        try {
            await db.withTransactionAsync(async () => {
                // 1. Process Calendar Changes
                for (const [key, newStatus] of unsavedChanges.entries()) {
                    const [dateStr, type] = key.split('|');
                    const status = newStatus ? 'completed' : 'missed';

                    await db.runAsync(
                        `INSERT INTO daily_status (date, type, status) VALUES (?, ?, ?)
                         ON CONFLICT(date, type) DO UPDATE SET status = excluded.status`,
                        [dateStr, type, status]
                    );

                    const change = newStatus ? -1 : 1;
                    
                    await db.runAsync(
                        `UPDATE debt_counts SET count = count + ? WHERE type = ?`,
                        [change, type]
                    );

                    await db.runAsync(
                        `INSERT INTO logs (type, amount) VALUES (?, ?)`,
                        [type, change]
                    );
                }

                // 2. Process Quick Adjustments
                // Note: user clicks (+) -> "Kıldım" -> Debt decreases (-1)
                // But in quickAdjustments we store the net change in debt count directly
                for (const [type, netChange] of Object.entries(quickAdjustments)) {
                    if (netChange === 0) continue;

                    await db.runAsync(
                        `UPDATE debt_counts SET count = count + ? WHERE type = ?`,
                        [netChange, type]
                    );

                    await db.runAsync(
                        `INSERT INTO logs (type, amount) VALUES (?, ?)`,
                        [type, netChange]
                    );
                }
            });

            setUnsavedChanges(new Map());
            setQuickAdjustments({});
            setSessionCounts({});
            await fetchMonthData(viewDate);
            Alert.alert("Başarılı", "Kayıt tamamlandı.");

        } catch (e) {
            console.error("Save error:", e);
            Alert.alert("Hata", "Kaydetme sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (type: string) => {
        if (isAfter(startOfDay(selectedDate), startOfDay(new Date()))) {
            Alert.alert("Uyarı", "Gelecek tarihler için işlem yapılamaz.");
            return;
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const key = `${dateStr}|${type}`;
        
        const dbStatus = monthData[dateStr]?.[type] || false;
        
        let currentStatus = dbStatus;
        if (unsavedChanges.has(key)) {
            currentStatus = unsavedChanges.get(key)!;
        }

        const newStatus = !currentStatus;

        const newMap = new Map(unsavedChanges);
        if (newStatus === dbStatus) {
            newMap.delete(key); 
        } else {
            newMap.set(key, newStatus);
        }
        setUnsavedChanges(newMap);
    };

    const getStatusForDay = (dateStr: string, type: string) => {
        const key = `${dateStr}|${type}`;
        if (unsavedChanges.has(key)) return unsavedChanges.get(key);
        return monthData[dateStr]?.[type] || false;
    };

    const handleQuickUpdate = async (type: string, change: number) => {
        // change: 1 (Kaza Kıldı, Borç Azalır) or -1 (Geri Al/Borç Ekle, Borç Artar)
        // This is pure UI session counting.
        
        // Update Session UI Counter
        setSessionCounts(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + change
        }));

        // Update Pending DB Adjustment
        // If user clicked + (change=1), they performed prayer -> Debt decreases (-1)
        // If user clicked - (change=-1), they added debt -> Debt increases (+1)
        const dbEffect = -change; 

        setQuickAdjustments(prev => ({
            ...prev,
            [type]: (prev[type] || 0) + dbEffect
        }));
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewDate);
        const firstDayOfMonth = getDay(startOfMonth(viewDate)); 
        const startingIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        const days = [];
        for (let i = 0; i < startingIndex; i++) {
            days.push(<View key={`empty-${i}`} style={{ width: DAY_SIZE, height: DAY_SIZE }} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = setDate(viewDate, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const isFutureDate = isAfter(startOfDay(date), startOfDay(new Date()));

            // Determine dots or single status
            let dots = null;

            if (activeTab === 'prayer') {
                dots = (
                    <View style={styles.dotsContainer}>
                        {PRAYER_TYPES.map(p => {
                            const isCompleted = getStatusForDay(dateStr, p.key);
                            return (
                                <View 
                                    key={p.key} 
                                    style={[
                                        styles.dot, 
                                        isCompleted ? { backgroundColor: p.color } : { backgroundColor: 'rgba(255,255,255,0.1)' }
                                    ]} 
                                />
                            );
                        })}
                    </View>
                );
            } else {
                // Fasting dot
                const isCompleted = getStatusForDay(dateStr, 'fasting');
                 if (isCompleted) {
                    dots = (
                        <View style={styles.dotsContainer}>
                             <View style={[styles.dot, { backgroundColor: '#CD853F', width: 6, height: 6, borderRadius: 3 }]} />
                        </View>
                    )
                 }
            }

            days.push(
                <TouchableOpacity 
                    key={i} 
                    style={[styles.dayCell, isSelected && styles.selectedDay]} 
                    onPress={() => setSelectedDate(date)}
                    disabled={isFutureDate}
                >
                    <Text style={[
                        styles.dayText, 
                        isSelected && styles.selectedDayText, 
                        isToday && !isSelected && styles.todayText,
                        isFutureDate && styles.futureDayText
                    ]}>
                        {i}
                    </Text>
                    {dots}
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.calendarGrid} {...panResponder.panHandlers}>
                {days}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <ChevronLeft color="#F5F0E1" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{activeTab === 'fasting' ? 'Oruç Borcu Düzenle' : 'Namaz Borcu Düzenle'}</Text>
                    <TouchableOpacity 
                        onPress={handleSave} 
                        style={styles.headerBtn}
                        disabled={unsavedChanges.size === 0 && Object.keys(quickAdjustments).length === 0}
                    >
                        <Text style={[styles.saveText, (unsavedChanges.size === 0 && Object.keys(quickAdjustments).length === 0) && { opacity: 0.5 }]}>Kaydet</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Scroll Content */}
                <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingBottom: 100 }} 
                    showsVerticalScrollIndicator={false}
                > 

                    {/* Category Selector */}
                    <Text style={styles.sectionLabel}>KATEGORİ SEÇİMİ</Text>
                    <View style={styles.categoryContainer}>
                        <TouchableOpacity 
                            style={[styles.categoryBtn, activeTab === 'prayer' && styles.activeCategory]} 
                            onPress={() => setActiveTab('prayer')}
                        >
                            <History 
                                color={activeTab === 'prayer' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)'} 
                                size={18} 
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.categoryText, activeTab === 'prayer' && styles.activeCategoryText]}>Namaz</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.categoryBtn, activeTab === 'fasting' && styles.activeCategory]} 
                            onPress={() => setActiveTab('fasting')}
                        >
                            <MoonStar 
                                color={activeTab === 'fasting' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)'} 
                                size={18} 
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.categoryText, activeTab === 'fasting' && styles.activeCategoryText]}>Oruç</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Year Selector */}
                    <View style={styles.yearContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                            {years.map(year => (
                                <TouchableOpacity 
                                    key={year} 
                                    style={[styles.yearBtn, getYear(viewDate) === year && styles.activeYearBtn]}
                                    onPress={() => setViewDate(setYear(viewDate, year))}
                                >
                                    <Text style={[styles.yearText, getYear(viewDate) === year && styles.activeYearText]}>{year}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Month Navigator */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={() => setViewDate(subMonths(viewDate, 1))} style={styles.navBtn}>
                            <ChevronLeft color="#CD853F" size={20} />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>{format(viewDate, 'MMMM yyyy', { locale: tr }).toUpperCase()}</Text>
                        <TouchableOpacity onPress={() => setViewDate(addMonths(viewDate, 1))} style={styles.navBtn}>
                            <ChevronRight color="#CD853F" size={20} />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarContainer}>
                        <View style={styles.weekRow}>
                            {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map(day => (
                                <Text key={day} style={styles.weekText}>{day}</Text>
                            ))}
                        </View>
                        {renderCalendar()}
                    </View>

                    {/* Detail Panel */}
                    <View style={styles.detailPanel}>
                        <View style={styles.detailHeader}>
                            <View style={styles.dateCircle}>
                                <Text style={styles.dateCircleText}>{format(selectedDate, 'd')}</Text>
                            </View>
                            <View>
                                <Text style={styles.detailDateText}>{format(selectedDate, 'd MMMM EEEE', { locale: tr })}</Text>
                                <Text style={styles.detailSubText}>SEÇİLİ GÜN</Text>
                            </View>
                        </View>

                        {activeTab === 'prayer' ? (
                            <View style={styles.prayerRow}>
                                {PRAYER_TYPES.map(type => {
                                    const isCompleted = getStatusForDay(format(selectedDate, 'yyyy-MM-dd'), type.key);
                                    return (
                                        <View key={type.key} style={{ alignItems: 'center' }}>
                                            <Text style={styles.prayerLabel}>{type.label}</Text>
                                            <TouchableOpacity 
                                                style={[styles.checkCircle, isCompleted && styles.checkCircleActive]}
                                                onPress={() => toggleStatus(type.key)}
                                            >
                                                {isCompleted && <Check size={20} color="#F5F0E1" strokeWidth={3} />}
                                            </TouchableOpacity>
                                        </View>
                                    )
                                })}
                            </View>
                        ) : (
                            <View>
                                <View style={styles.fastingRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.fastingLabel, { marginRight: 8 }]}>🍃</Text>
                                        <Text style={styles.fastingLabel}>Oruç Tutuldu</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.toggleTrack, getStatusForDay(format(selectedDate, 'yyyy-MM-dd'), 'fasting') && styles.toggleTrackActive]}
                                        onPress={() => toggleStatus('fasting')}
                                    >
                                        <View style={[styles.toggleThumb, getStatusForDay(format(selectedDate, 'yyyy-MM-dd'), 'fasting') && styles.toggleThumbActive]} />
                                    </TouchableOpacity>
                                </View>
                                
                                <Text style={styles.inputLabel}>KAZA SEBEBİ (OPSİYONEL)</Text>
                                <TextInput 
                                    style={styles.textInput}
                                    placeholder="Örn: Hastalık, Seferilik..."
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    value={fastingReason}
                                    onChangeText={setFastingReason}
                                />
                            </View>
                        )}
                    </View>

                    {/* QUICK ENTRY SECTION */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionLabel}>HIZLI KAZA GİRİŞİ</Text>
                        <View style={styles.quickEntryPanel}>
                            {activeTab === 'prayer' ? (
                                PRAYER_TYPES.map(type => (
                                    <View key={type.key} style={styles.quickEntryRow}>
                                        <Text style={styles.quickEntryLabel}>{type.label}</Text>
                                        <View style={styles.counterContainer}>
                                            <TouchableOpacity 
                                                style={styles.counterBtn}
                                                onPress={() => handleQuickUpdate(type.key, -1)}
                                            >
                                                <Minus size={20} color="rgba(245, 240, 225, 0.5)" />
                                            </TouchableOpacity>
                                            
                                            <Text style={styles.counterValue}>
                                                {sessionCounts[type.key] || 0}
                                            </Text>
                                            
                                            <TouchableOpacity 
                                                style={[styles.counterBtn, styles.counterBtnActive]}
                                                onPress={() => handleQuickUpdate(type.key, 1)}
                                            >
                                                <Plus size={20} color="#3E322A" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.quickEntryRow}>
                                    <Text style={styles.quickEntryLabel}>Oruç</Text>
                                    <View style={styles.counterContainer}>
                                        <TouchableOpacity 
                                            style={styles.counterBtn}
                                            onPress={() => handleQuickUpdate('fasting', -1)}
                                        >
                                            <Minus size={20} color="rgba(245, 240, 225, 0.5)" />
                                        </TouchableOpacity>
                                        
                                        <Text style={styles.counterValue}>
                                            {sessionCounts['fasting'] || 0}
                                        </Text>
                                        
                                        <TouchableOpacity 
                                            style={[styles.counterBtn, styles.counterBtnActive]}
                                            onPress={() => handleQuickUpdate('fasting', 1)}
                                        >
                                            <Plus size={20} color="#3E322A" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                             <Text style={{ color: 'rgba(245, 240, 225, 0.4)', fontSize: 11, lineHeight: 16 }}>
                                 Bu alandan yaptığınız girişler anlık olarak uygulanmaz. (+) ile kaza düşebilir, (-) ile borç ekleyebilirsiniz. Değişiklikler kaydet butonuna basıldığında işlenir.
                             </Text>
                        </View>
                    </View>

                    {/* Info Text */}
                    <View style={styles.infoFooter}>
                        <Info size={16} color="#CD853F" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={styles.infoText}>
                            Geçmiş borçlarınızı yukarıdaki takvimden tek tek güncelleyebilirsiniz. Yapılan değişiklikler kaydedilmeden sistemde güncellenmez.
                        </Text>
                    </View>
                
                </ScrollView> 
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3E322A',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        zIndex: 10, // Ensure header is clickable
    },
    headerBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    saveText: {
        color: '#CD853F',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionLabel: {
        fontSize: 10,
        color: 'rgba(245, 240, 225, 0.4)',
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 8,
        letterSpacing: 1,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    categoryContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    categoryBtn: {
        flex: 1,
        backgroundColor: '#4A3D35', 
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12, // More rounded like pills
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        flexDirection: 'row', // Align icon and text
    },
    activeCategory: {
        backgroundColor: '#CD853F', 
        borderColor: '#CD853F',
    },
    categoryText: {
        color: 'rgba(245, 240, 225, 0.6)',
        fontWeight: '600',
        fontSize: 16,
    },
    activeCategoryText: {
        color: '#F5F0E1', 
        fontWeight: 'bold',
    },
    yearContainer: {
        marginBottom: 16,
    },
    yearBtn: {
        marginRight: 24,
        paddingBottom: 4,
    },
    activeYearBtn: {
        borderBottomWidth: 2,
        borderBottomColor: '#CD853F',
    },
    yearText: {
        fontSize: 18,
        color: 'rgba(245, 240, 225, 0.4)',
        fontWeight: '600',
    },
    activeYearText: {
        color: '#F5F0E1', 
        fontWeight: 'bold',
        fontSize: 20,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    navBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4A3D35',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        color: '#F5F0E1',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    calendarContainer: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekText: {
        width: DAY_SIZE,
        textAlign: 'center',
        color: 'rgba(245, 240, 225, 0.4)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE, // Square aspect ratio
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2, // Tighter spacing
    },
    selectedDay: {
        backgroundColor: '#4A3D35',
        borderRadius: 8, // Square with slight rounding
        borderWidth: 1,
        borderColor: '#CD853F',
    },
    dayText: {
        color: '#F5F0E1',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    selectedDayText: {
        fontWeight: 'bold',
        color: '#CD853F', 
    },
    todayText: {
        color: '#CD853F',
        fontWeight: 'bold',
    },
    futureDayText: {
        opacity: 0.3,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
        height: 4, // Fixed height space
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    
    // DETAIL PANEL
    detailPanel: {
        backgroundColor: '#4A3D35',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dateCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#CD853F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    dateCircleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    detailDateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    detailSubText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#CD853F',
        marginTop: 2,
    },
    prayerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    prayerLabel: {
        fontSize: 12,
        color: 'rgba(245, 240, 225, 0.5)',
        marginBottom: 8,
    },
    checkCircle: {
        width: 44,
        height: 44,
        borderRadius: 14, 
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleActive: {
        backgroundColor: '#CD853F',
    },
    fastingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    fastingLabel: {
        color: '#F5F0E1',
        fontSize: 16,
        fontWeight: 'bold',
    },
    toggleTrack: {
        width: 52,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 2,
    },
    toggleTrackActive: {
        backgroundColor: '#CD853F',
    },
    toggleThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F5F0E1',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    inputLabel: {
        fontSize: 10,
        color: 'rgba(245, 240, 225, 0.4)',
        fontWeight: 'bold',
        marginBottom: 8,
        marginLeft: 4,
    },
    textInput: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        color: '#F5F0E1',
        fontSize: 14,
    },
    infoFooter: {
        flexDirection: 'row',
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        alignItems: 'flex-start',
        marginBottom: 40, // extra margin at bottom
    },
    infoText: {
        flex: 1,
        color: 'rgba(245, 240, 225, 0.5)',
        fontSize: 12,
        lineHeight: 18,
    },
    
    // QUICK ENTRY STYLES
    quickEntryPanel: {
        backgroundColor: '#4A3D35',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    quickEntryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 12,
        borderRadius: 16,
    },
    quickEntryLabel: {
        color: '#F5F0E1',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    counterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    counterBtnActive: {
        backgroundColor: '#CD853F',
        borderColor: '#CD853F',
    },
    counterValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#CD853F',
        minWidth: 24,
        textAlign: 'center',
    },
});
