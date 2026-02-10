import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useState, useCallback } from 'react';
import { ChevronLeft, Info, Calendar, CheckSquare, List } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
// @ts-ignore
import { getDb } from '@/db';
import { format, differenceInDays, subDays, getYear, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

const PRAYER_TYPES = [
    { key: 'fajr', label: 'Sabah', color: '#88B04B' }, 
    { key: 'dhuhr', label: 'Öğle', color: '#FFCC66' }, 
    { key: 'asr', label: 'İkindi', color: '#FF9966' }, 
    { key: 'maghrib', label: 'Akşam', color: '#CC6633' }, 
    { key: 'isha', label: 'Yatsı', color: '#663399' }, 
    { key: 'witr', label: 'Vitir', color: '#9966CC' }, 
];

export default function StatsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'prayer' | 'fasting'>(
        (params.tab as 'prayer' | 'fasting') || 'prayer'
    );

    // --- PRAYER STATS ---
    const [totalPrayerObligation, setTotalPrayerObligation] = useState(0); // Lifetime total needed
    const [totalPrayerDebt, setTotalPrayerDebt] = useState(0); // Current debt
    const [totalPrayerCompleted, setTotalPrayerCompleted] = useState(0); // Derived: Obligation - Debt
    
    // Per Prayer Type breakdown
    const [prayerBreakdown, setPrayerBreakdown] = useState<{
        key: string; label: string; color: string; 
        obligation: number; debt: number; completed: number; percent: number 
    }[]>([]);

    const [weeklyPrayerData, setWeeklyPrayerData] = useState<number[]>(new Array(7).fill(0));
    const [prayerEstDate, setPrayerEstDate] = useState<string>('-');

    // --- FASTING STATS ---
    const [totalFastingObligation, setTotalFastingObligation] = useState(0); // Lifetime days
    const [totalFastingDebt, setTotalFastingDebt] = useState(0);
    const [totalFastingCompleted, setTotalFastingCompleted] = useState(0);
    
    const [weeklyFastingData, setWeeklyFastingData] = useState<number[]>(new Array(7).fill(0));
    const [fastingEstDate, setFastingEstDate] = useState<string>('-');

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const fetchStats = async () => {
        try {
            setLoading(true);
            const db = getDb();

            // 1. Get Profile (Start Date)
            const profile: any = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
            let startDate = new Date();
            // Default logic if no profile: 1 year ago? Or just today (0 obligation).
            if (profile) {
                if (profile.regular_start_date) startDate = new Date(profile.regular_start_date);
                else if (profile.bulugh_date) startDate = new Date(profile.bulugh_date);
                else {
                     // Fallback: Use creation date or something reasonable? Can default to 1 year back for demo.
                     startDate.setFullYear(startDate.getFullYear() - 1);
                }
            } else {
                 startDate.setFullYear(startDate.getFullYear() - 1);
            }

            const today = new Date();
            const daysSinceStart = Math.max(0, differenceInDays(today, startDate));
            
            // --- PRAYER ---
            // Total Obligation (Lifetime): Days * 6 (5 Daily + Witr)
            // Or 5 depending on sect/preference? App usually does 6.
            // Let's assume 6 since PRAYER_TYPES has 6.
            const multiplier = PRAYER_TYPES.length; 
            const calcTotalPrayerObligation = daysSinceStart * multiplier;

            // Fetch Current Debts
            const debts: any[] = await db.getAllAsync("SELECT * FROM debt_counts WHERE type != 'fasting'");
            let calcTotalPrayerDebt = 0;
            const debtMap = new Map(); // key -> count
            debts.forEach(d => {
                calcTotalPrayerDebt += d.count;
                debtMap.set(d.type, d.count);
            });

            // Calculate Completed
            // Logic: Completed = Obligation - Debt.
            // But debt comes from manual entry or auto-calc. 
            // If Obligation < Debt (e.g. user added extra debt manually beyond calculated from date), 
            // then Completed = 0 (or negative? capped at 0).
            // Usually Obligation >= Debt.
            let calcTotalPrayerCompleted = Math.max(0, calcTotalPrayerObligation - calcTotalPrayerDebt);

            setTotalPrayerObligation(calcTotalPrayerObligation);
            setTotalPrayerDebt(calcTotalPrayerDebt);
            setTotalPrayerCompleted(calcTotalPrayerCompleted);

            // Detailed Breakdown
            const breakdown = PRAYER_TYPES.map(p => {
                const obligation = daysSinceStart; // 1 per day per type
                const debt = debtMap.get(p.key) || 0;
                // If debt > obligation (user added custom), completed is 0? 
                // Let's assume user tracks real debt.
                // However, total obligation should match debt logic. 
                // If user edits debt freely, obligation based on date might be out of sync.
                // Design choice: Use date-based obligation for "Life Progress".
                // If debt > obligation, maybe user started tracking earlier?
                // For safety: completed = max(0, obligation - debt)
                const completed = Math.max(0, obligation - debt); 
                const percent = obligation > 0 ? (completed / obligation) * 100 : 0;
                
                return {
                    ...p,
                    obligation,
                    debt,
                    completed,
                    percent
                };
            });
            setPrayerBreakdown(breakdown);

            // Weekly Stats (Logs)
            const pWeekly = new Array(7).fill(0);
            for (let i = 0; i < 7; i++) {
                const d = subDays(today, 6 - i);
                const dStr = format(d, 'yyyy-MM-dd');
                const logs: any = await db.getAllAsync(
                    "SELECT COUNT(*) as c FROM logs WHERE date(created_at) = ? AND amount < 0 AND type != 'fasting'", 
                    [dStr]
                );
                pWeekly[i] = logs[0]?.c || 0;
            }
            setWeeklyPrayerData(pWeekly);

            // Estimate
            const pTotalWeek = pWeekly.reduce((a, b) => a + b, 0);
            const pAvg = pTotalWeek / 7;
            if (pAvg > 0) {
                const daysLeft = calcTotalPrayerDebt / pAvg;
                const finishDate = new Date();
                finishDate.setDate(today.getDate() + daysLeft);
                setPrayerEstDate(format(finishDate, 'd MMM yyyy', { locale: tr }));
            } else {
                setPrayerEstDate('-');
            }


            // --- FASTING ---
            // Approximate logic: 30 days per year
            // Determine number of Ramadans passed? 
            // Simple: Years * 30.
            const yearsSinceStart = Math.max(0, today.getFullYear() - startDate.getFullYear());
            const calcTotalFastingObligation = yearsSinceStart * 30; // 30 days per year

            const fDebtRes: any = await db.getFirstAsync("SELECT * FROM debt_counts WHERE type = 'fasting'");
            const calcTotalFastingDebt = fDebtRes ? fDebtRes.count : 0;

            const calcTotalFastingCompleted = Math.max(0, calcTotalFastingObligation - calcTotalFastingDebt);

            setTotalFastingObligation(calcTotalFastingObligation);
            setTotalFastingDebt(calcTotalFastingDebt);
            setTotalFastingCompleted(calcTotalFastingCompleted);

            // Weekly Fasting
            const fWeekly = new Array(7).fill(0);
            for (let i = 0; i < 7; i++) {
                const d = subDays(today, 6 - i);
                const dStr = format(d, 'yyyy-MM-dd');
                const logs: any = await db.getAllAsync(
                    "SELECT COUNT(*) as c FROM logs WHERE date(created_at) = ? AND amount < 0 AND type = 'fasting'", 
                    [dStr]
                );
                fWeekly[i] = logs[0]?.c || 0;
            }
            setWeeklyFastingData(fWeekly);

             // Estimate Fasting
             const fTotalWeek = fWeekly.reduce((a, b) => a + b, 0);
             const fAvg = fTotalWeek / 7;
             if (fAvg > 0) {
                 const fDaysLeft = calcTotalFastingDebt / fAvg;
                 const fFinish = new Date();
                 fFinish.setDate(today.getDate() + fDaysLeft);
                 setFastingEstDate(format(fFinish, 'd MMM yyyy', { locale: tr }));
             } else {
                 setFastingEstDate('-');
             }


        } catch (e) {
            console.error("Stats v2 error:", e);
        } finally {
            setLoading(false);
        }
    };

    const CircularProgress = ({ percent, label }: { percent: number, label: string }) => {
        const size = 180;
        const strokeWidth = 16;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        // Cap percent at 100
        const p = Math.min(100, Math.max(0, percent));
        const strokeDashoffset = circumference - ((p / 100) * circumference);

        return (
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size}>
                    <G rotation="-90" origin={`${size/2}, ${size/2}`}>
                        {/* Track */}
                        <Circle
                            stroke="rgba(255, 255, 255, 0.1)"
                            fill="none"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            strokeWidth={strokeWidth}
                        />
                        {/* Progress */}
                        <Circle
                            stroke="#CD853F"
                            fill="none"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    </G>
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Text style={styles.cpPercent}>%{Math.round(p)}</Text>
                    <Text style={styles.cpLabel}>{label}</Text>
                </View>
            </View>
        );
    };

    const BarChart = ({ data, labels }: { data: number[], labels: string[] }) => {
        const max = Math.max(...data, 1);
        return (
            <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10 }}>
                {data.map((val, i) => (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                         <View style={{ width: 6, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, justifyContent: 'flex-end' }}>
                             <View style={{ width: 6, height: `${(val / max) * 100}%`, backgroundColor: '#CD853F', borderRadius: 3 }} />
                         </View>
                         <Text style={{ color: 'rgba(245, 240, 225, 0.4)', fontSize: 10, marginTop: 6 }}>{labels[i]}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <ChevronLeft color="#F5F0E1" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Gelişmiş İstatistikler</Text>
                    <View style={styles.headerBtn} /> 
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'prayer' && styles.activeTab]} 
                        onPress={() => setActiveTab('prayer')}
                    >
                        <Text style={[styles.tabText, activeTab === 'prayer' && styles.activeTabText]}>Namaz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'fasting' && styles.activeTab]} 
                        onPress={() => setActiveTab('fasting')}
                    >
                        <Text style={[styles.tabText, activeTab === 'fasting' && styles.activeTabText]}>Oruç</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {activeTab === 'prayer' ? (
                        <>
                            {/* Circular Progress Section */}
                            <View style={styles.heroSection}>
                                <CircularProgress 
                                    percent={(totalPrayerObligation > 0) ? (totalPrayerCompleted / totalPrayerObligation) * 100 : 0} 
                                    label="ÖMÜR BOYU TAMAMLANAN"
                                />
                            </View>

                            {/* Total Summary Card */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>TOPLAM FARZ (BUGÜNE KADAR)</Text>
                                <Text style={styles.summaryValue}>{totalPrayerObligation.toLocaleString('tr-TR')}</Text>
                                <Text style={styles.summarySub}>Buluğ çağından itibaren toplam yükümlülük</Text>
                            </View>

                            {/* Detailed Stats Cards (Side by Side) */}
                            <View style={styles.row}>
                                <View style={[styles.statCard, { marginRight: 8 }]}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(74, 61, 53, 0.5)' }]}>
                                        <CheckSquare color="#CD853F" size={20} />
                                    </View>
                                    <Text style={styles.cardLabel}>TAMAMLANAN</Text>
                                    <Text style={styles.cardValue}>{totalPrayerCompleted.toLocaleString('tr-TR')}</Text>
                                </View>
                                <View style={[styles.statCard, { marginLeft: 8 }]}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(74, 61, 53, 0.5)' }]}>
                                        <List color="#CD853F" size={20} />
                                    </View>
                                    <Text style={styles.cardLabel}>KALAN İBADETLER</Text>
                                    <Text style={styles.cardValue}>{totalPrayerDebt.toLocaleString('tr-TR')}</Text>
                                </View>
                            </View>

                            {/* Weekly Progress */}
                            <View style={styles.section}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.sectionTitle}>7 Günlük İlerleme</Text>
                                    <Text style={styles.sectionSub}>Kılınan Vakit Sayısı</Text>
                                </View>
                                <View style={styles.chartCard}>
                                    <BarChart 
                                        data={weeklyPrayerData} 
                                        labels={weeklyPrayerData.map((_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: tr }).toUpperCase())}
                                    />
                                </View>
                            </View>

                            {/* Breakdown by Type */}
                            <View style={styles.section}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.sectionTitle}>Vakitlere Göre</Text>
                                    <Text style={styles.sectionSub}>Vakit Bazlı Başarı</Text>
                                </View>
                                <View style={styles.listCard}>
                                    {prayerBreakdown.map((item, index) => (
                                        <View key={item.key} style={styles.breakdownItem}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={styles.bdLabel}>{item.label}</Text>
                                                <Text style={styles.bdPercent}>%{Math.round(item.percent)}</Text>
                                            </View>
                                            <View style={styles.bdTrack}>
                                                <View style={[styles.bdFill, { width: `${Math.min(100, item.percent)}%`, backgroundColor: item.color }]} />
                                            </View>
                                            {index < prayerBreakdown.length - 1 && <View style={styles.divider} />}
                                        </View>
                                    ))}
                                    <Text style={styles.footnote}>Her vakit için bugüne kadarki toplam yükümlülüğünüz baz alınmıştır.</Text>
                                </View>
                            </View>

                            {/* Motivation / Estimate */}
                            <View style={styles.motivationCard}>
                                <View style={[styles.iconCircle, { backgroundColor: '#CD853F' }]}>
                                    <Calendar color="#3E322A" size={24} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.motivTitle}>Tahmini Bitiş Tarihi</Text>
                                    <Text style={styles.motivText}>
                                        Azimle devam ediyorsunuz! Mevcut hızınızla kalan tüm ibadetlerinizi <Text style={styles.highlightText}>{prayerEstDate !== '-' ? prayerEstDate : 'belirlenemiyor'}</Text> tarihinde tamamlayabilirsiniz.
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                             {/* FASTING Circular Progress */}
                             <View style={styles.heroSection}>
                                <CircularProgress 
                                    percent={(totalFastingObligation > 0) ? (totalFastingCompleted / totalFastingObligation) * 100 : 0} 
                                    label="YAŞAM BOYU İLERLEME"
                                />
                            </View>

                            {/* Total Summary Card */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>TOPLAM FARZ ORUÇ (BUGÜNE KADAR)</Text>
                                <Text style={styles.summaryValue}>{totalFastingObligation.toLocaleString('tr-TR')} Gün</Text>
                            </View>

                            {/* Detailed Stats Cards (Side by Side) */}
                            <View style={styles.row}>
                                <View style={[styles.statCard, { marginRight: 8 }]}>
                                    <Text style={styles.cardLabel}>TAMAMLANAN</Text>
                                    <Text style={[styles.cardValue, { color: '#CD853F' }]}>{totalFastingCompleted}</Text>
                                    <Text style={styles.cardUnit}>GÜN</Text>
                                </View>
                                <View style={[styles.statCard, { marginLeft: 8 }]}>
                                    <Text style={styles.cardLabel}>KALAN İBADETLER</Text>
                                    <Text style={styles.cardValue}>{totalFastingDebt}</Text>
                                    <Text style={styles.cardUnit}>GÜN</Text>
                                </View>
                            </View>

                             {/* Weekly Progress */}
                             <View style={styles.section}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.sectionTitle}>7 Günlük İlerleme</Text>
                                    <Text style={styles.sectionSub}>Son Tamamlananlar</Text>
                                </View>
                                <View style={styles.chartCard}>
                                    <BarChart 
                                        data={weeklyFastingData} 
                                        labels={weeklyFastingData.map((_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: tr }).toUpperCase())}
                                    />
                                </View>
                            </View>

                            {/* Motivation Orange Card */}
                            <View style={[styles.motivationCard, { backgroundColor: '#CD853F' }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.motivTitle, { color: '#3E322A' }]}>MANEVİ MOTİVASYON</Text>
                                    <Text style={styles.quoteText}>"Sabredenlere mükafatları hesapsız ödenecektir."</Text>
                                    <Text style={styles.quoteSource}>— Zümer Suresi, 10. Ayet</Text>

                                    <View style={styles.estimateBox}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.estimateLabel}>TAHMİNİ BİTİŞ HEDEFİ</Text>
                                            <Text style={styles.estimateDate}>{fastingEstDate !== '-' ? fastingEstDate : '...'}</Text>
                                        </View>
                                        <Calendar color="#F5F0E1" size={24} />
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={{ height: 40 }} />
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerBtn: {
        width: 40, 
        height: 40,
        backgroundColor: 'rgba(74, 61, 53, 0.5)', 
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(74, 61, 53, 0.5)',
        marginHorizontal: 16,
        padding: 4,
        borderRadius: 25,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 21,
    },
    activeTab: {
        backgroundColor: '#CD853F',
    },
    tabText: {
        color: 'rgba(245, 240, 225, 0.5)',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#F5F0E1',
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 24,
    },
    cpPercent: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#CD853F',
    },
    cpLabel: {
        fontSize: 10,
        color: 'rgba(245, 240, 225, 0.6)',
        marginTop: 4,
        fontWeight: 'bold',
        letterSpacing: 1,
        textAlign: 'center',
        maxWidth: 100,
    },
    summaryCard: {
        backgroundColor: '#4A3D35',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    summaryLabel: {
        color: '#CD853F',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    summaryValue: {
        color: '#F5F0E1',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    summarySub: {
        color: 'rgba(245, 240, 225, 0.4)',
        fontSize: 11,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#4A3D35',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardLabel: {
        color: 'rgba(245, 240, 225, 0.5)',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    cardUnit: {
        fontSize: 10,
        color: 'rgba(245, 240, 225, 0.4)',
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F5F0E1',
    },
    sectionSub: {
        fontSize: 12,
        color: 'rgba(245, 240, 225, 0.4)',
    },
    chartCard: {
        backgroundColor: '#4A3D35',
        borderRadius: 20, // More rounded like design
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    listCard: {
        backgroundColor: '#4A3D35',
        borderRadius: 20,
        padding: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    breakdownItem: {
        marginBottom: 12,
    },
    bdLabel: {
        color: '#F5F0E1',
        fontSize: 14,
        fontWeight: '500',
    },
    bdPercent: {
        color: '#CD853F',
        fontSize: 14,
        fontWeight: 'bold',
    },
    bdTrack: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 4,
        marginTop: 4,
    },
    bdFill: {
        height: 8,
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 12,
    },
    footnote: {
        fontSize: 10,
        color: 'rgba(245, 240, 225, 0.3)',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    motivationCard: {
        backgroundColor: '#4A3D35',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    motivTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F5F0E1',
        marginBottom: 4,
    },
    motivText: {
        fontSize: 12,
        color: 'rgba(245, 240, 225, 0.6)',
        lineHeight: 18,
    },
    highlightText: {
        color: '#CD853F',
        fontWeight: 'bold',
    },
    quoteText: {
        fontSize: 16,
        color: '#F5F0E1', // on orange bg might need dark text
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginTop: 8,
        marginBottom: 8,
    },
    quoteSource: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    estimateBox: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    estimateLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: 'bold',
    },
    estimateDate: {
        fontSize: 16,
        color: '#F5F0E1',
        fontWeight: 'bold',
    },
});
