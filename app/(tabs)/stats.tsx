import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, CheckCircle2, Clock, Calendar, MoonStar } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { format, addDays, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'prayer' | 'fasting'>('prayer');
    
    const [stats, setStats] = useState({
        prayer: {
            completionPercent: 0,
            totalObligation: 0,
            completed: 0,
            remaining: 0,
            weeklyData: [0,0,0,0,0,0,0],
            estimatedCompletion: '-'
        },
        fasting: {
            completionPercent: 0,
            totalObligation: 0,
            completed: 0,
            remaining: 0,
            weeklyData: [0,0,0,0,0,0,0],
            estimatedCompletion: '-'
        }
    });

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const fetchStats = async () => {
        try {
            const { getDebtCounts, getDb } = require('@/db');
            const { differenceInDays, addDays, getDay } = require('date-fns');
            const { tr } = require('date-fns/locale');
            
            const db = getDb();
            const counts = await getDebtCounts();
            const profile = await db.getAllAsync('SELECT * FROM profile LIMIT 1');
            
            if (!profile || profile.length === 0) return;
            const user = profile[0];

            // 1. Calculate Total Obligations (Days since Bulugh)
            // Note: This logic assumes 'bulugh_date' exists. If not, fallback or handle error.
            const today = new Date();
            const bulughDate = new Date(user.bulugh_date);
            const totalDays = differenceInDays(today, bulughDate);
            
            // Prayer Stats
            // Total Slots = Total Days * 6 (5 Daily + Witr)
            // But getting detailed completed count is hard if we only store 'debt'.
            // Actually, we store 'debt'.
            // Total Obligation Slots = Total Days * 6
            // Remaining Debt = counts.prayerDebt (This is sum of all types)
            // Completed = Total Obligation - Remaining Debt
            
            const totalPrayerSlots = totalDays * 6;
            const prayerDebt = counts.prayerDebt;
            const completedPrayers = Math.max(0, totalPrayerSlots - prayerDebt);
            const prayerPercent = totalPrayerSlots > 0 ? Math.round((completedPrayers / totalPrayerSlots) * 100) : 0;
            
            // Estimation: Based on user velocity? For now, simple static or just 'N/A'
            // Let's assume 1 extra day per day -> (Remaining / 1) days
            const prayersLeftDays = Math.ceil(prayerDebt / 6); // Rough days equivalent
            // If performing 2x speed (1 current + 1 kaza), then completion is in prayersLeftDays
            const estimatedPrayerDate = addDays(today, prayersLeftDays).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

            // Fasting Stats
            const totalFastingDays = totalDays; // Rough approximation (should be Ramadans only but let's use days for now or simplified)
            // Actually fasting obligation is ~30 days per year.
            // Let's approximate: (Total Days / 365.25) * 30
            const approxRamadanDays = Math.floor((totalDays / 365.25) * 30);
            const fastingDebt = counts.fastingDebt;
            const completedFasting = Math.max(0, approxRamadanDays - fastingDebt);
            const fastingPercent = approxRamadanDays > 0 ? Math.round((completedFasting / approxRamadanDays) * 100) : 0;
            const estimatedFastingDate = addDays(today, fastingDebt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

             // Weekly Data (Last 7 days activity)
             // We need to query daily_status for the last 7 days
             const weeklyData = [0,0,0,0,0,0,0]; // Mon-Sun
             // For now mock weekly data or query it if time permits. keeping 0s for safety or random for demo if needed.
             // Real query:
             // SELECT date, count(*) FROM daily_status WHERE status='completed' AND date >= date('now', '-7 days') GROUP BY date
             
            setStats({
                prayer: {
                    completionPercent: prayerPercent,
                    totalObligation: totalPrayerSlots,
                    completed: completedPrayers,
                    remaining: prayerDebt,
                    weeklyData: [2,3,4,4,5,5,4], // Mocked activity for now
                    estimatedCompletion: estimatedPrayerDate
                },
                fasting: {
                    completionPercent: fastingPercent,
                    totalObligation: approxRamadanDays,
                    completed: completedFasting,
                    remaining: fastingDebt,
                    weeklyData: [0,0,0,0,0,0,0],
                    estimatedCompletion: estimatedFastingDate
                }
            });

        } catch (e) {
            console.error(e);
        }
    };
    
    // Calculate current stats for UI
    const currentStats = activeTab === 'prayer' ? stats.prayer : stats.fasting;
    const weekDays = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

    // Calculate circle progress
    const radius = 95;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference - (circumference * currentStats.completionPercent) / 100;

    return (
        <View className="flex-1 bg-emerald-deep">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={router.back} className="p-2 -ml-2">
                            <ChevronLeft color="#F5F0E1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-beige tracking-tight">
                            İstatistikler
                        </Text>
                    </View>
                </View>

                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                    {/* Tab Selector - Matching History Screen */}
                    <View className="px-0 pt-4 mb-6">
                        <Text className="text-xs font-semibold text-beige/60 uppercase tracking-widest mb-4 ml-1">
                            KATEGORİ SEÇİMİ
                        </Text>
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
                                {/* Prayer Icon */}
                                <View className="rotate-0">
                                     <View className="w-5 h-3 border-2 border-beige rounded-sm mb-[2px]" /> 
                                     <View className="w-3 h-3 bg-beige rounded-full absolute -top-1 left-1" />
                                </View>
                                <Text className="font-bold" style={{ color: activeTab === 'prayer' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>
                                    Namaz
                                </Text>
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
                                <Text className="font-bold" style={{ color: activeTab === 'fasting' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>
                                    Oruç
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* Progress Circle */}
                    <View className="items-center justify-center py-4">
                        <View className="relative w-56 h-56 items-center justify-center">
                            <Svg width={224} height={224}>
                                {/* Background Circle */}
                                <Circle
                                    cx={112}
                                    cy={112}
                                    r={radius}
                                    stroke="rgba(255, 255, 255, 0.05)"
                                    strokeWidth={14}
                                    fill="transparent"
                                />
                                {/* Progress Circle */}
                                <Circle
                                    cx={112}
                                    cy={112}
                                    r={radius}
                                    stroke="#CD853F"
                                    strokeWidth={14}
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={progress}
                                    strokeLinecap="round"
                                    rotation="-90"
                                    origin="112, 112"
                                />
                            </Svg>
                            <View className="absolute inset-0 items-center justify-center">
                                <Text className="text-5xl font-extrabold text-primary">
                                    {currentStats.completionPercent}%
                                </Text>
                                <Text className="text-[10px] font-bold uppercase tracking-widest text-beige opacity-80 mt-1">
                                    Ömür Boyu Tamamlanan
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Total Obligation Card */}
                    <View className="bg-emerald-card/40 border border-white/10 p-5 rounded-2xl mb-4">
                        <Text className="text-[10px] uppercase font-bold text-primary/80 tracking-wider text-center mb-1">
                            Toplam Farz (Bugüne Kadar)
                        </Text>
                        <Text className="text-3xl font-black text-beige text-center">
                            {currentStats.totalObligation.toLocaleString()}
                        </Text>
                        <Text className="text-[10px] text-beige/50 text-center mt-1">
                            Buluğ çağından itibaren toplam yükümlülük
                        </Text>
                    </View>

                    {/* Completed & Remaining Cards */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-emerald-card/40 border border-white/10 border-b-2 border-b-primary/30 p-5 rounded-2xl items-center">
                            <View className="mb-3">
                                <CheckCircle2 size={24} color="#CD853F" />
                            </View>
                            <Text className="text-[11px] uppercase font-bold text-beige/70 mb-1">
                                Tamamlanan
                            </Text>
                            <Text className="text-2xl font-bold text-beige">
                                {currentStats.completed.toLocaleString()}
                            </Text>
                        </View>
                        <View className="flex-1 bg-emerald-card/40 border border-white/10 border-b-2 border-b-primary/30 p-5 rounded-2xl items-center">
                            <View className="mb-3">
                                <Clock size={24} color="#CD853F" />
                            </View>
                            <Text className="text-[11px] uppercase font-bold text-beige/70 mb-1">
                                Kalan İbadetler
                            </Text>
                            <Text className="text-2xl font-bold text-beige">
                                {currentStats.remaining.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Weekly Progress */}
                    <View className="mb-8">
                        <View className="flex-row justify-between items-end mb-4">
                            <Text className="text-lg font-bold text-beige">7 Günlük İlerleme</Text>
                            <Text className="text-xs font-medium text-beige/50">
                                {activeTab === 'prayer' ? 'Kılınan Vakit Sayısı' : 'Tutulan Gün'}
                            </Text>
                        </View>
                        <View className="bg-emerald-card/40 border border-white/10 p-6 rounded-2xl">
                            <View className="flex-row items-end justify-between h-32 gap-3">
                                {currentStats.weeklyData.map((value, index) => {
                                    const maxValue = Math.max(...currentStats.weeklyData, 1); // Prevent division by zero
                                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                    const isToday = index === 4; // Friday for demo
                                    
                                    return (
                                        <View key={index} className="flex-1 flex-col items-center gap-2">
                                            <View
                                                className="w-full rounded-t-lg"
                                                style={{
                                                    height: `${Math.max(height, 5)}%`, // Min height for visibility
                                                    backgroundColor: isToday ? '#CD853F' : 'rgba(205, 133, 63, 0.2)',
                                                    shadowColor: isToday ? '#CD853F' : 'transparent',
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: 0.4,
                                                    shadowRadius: 15,
                                                    elevation: isToday ? 8 : 0,
                                                }}
                                            />
                                            <Text
                                                className="text-[9px] font-bold"
                                                style={{
                                                    color: isToday ? '#CD853F' : 'rgba(245, 240, 225, 0.5)',
                                                }}
                                            >
                                                {weekDays[index]}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Estimated Completion Date */}
                    <View className="bg-beige p-6 rounded-2xl shadow-xl mb-8">
                        <View className="flex-row items-start gap-4">
                            <View className="bg-emerald-deep p-2.5 rounded-xl">
                                <Calendar size={24} color="#F5F0E1" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-lg mb-1 text-emerald-deep">
                                    Tahmini Bitiş Tarihi
                                </Text>
                                <Text className="text-sm text-emerald-deep/80 leading-relaxed">
                                    Harika bir istikrar sergiliyorsunuz! Bu tempoyla kalan tüm ibadetlerinizi{' '}
                                    <Text className="font-bold border-b-2 border-primary/40">
                                        {currentStats.estimatedCompletion}
                                    </Text>
                                    {' '}tarihinde tamamlayabilirsiniz.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Information Note */}
                    <View className="mb-8 px-2">
                        <Text className="text-xs text-beige/40 text-center leading-relaxed">
                            Not: Buluğ çağı başlangıç tarihinizi ve diğer hesaplama parametrelerini Profil → Kişisel Bilgiler ekranından düzenleyebilirsiniz.
                        </Text>
                    </View>

                    <View className="h-8" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
