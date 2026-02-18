import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, CheckCircle2, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { format, subDays, isSameDay } from 'date-fns';
import { tr, enUS, ar } from 'date-fns/locale';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    date: Date;
    type: 'prayer' | 'info';
    read: boolean;
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        // Mark as read immediately on open
        AsyncStorage.setItem('last_notification_read_date', new Date().toISOString());
        generateNotifications();
    }, [i18n.language]);

    const generateNotifications = async () => {
        // 1. Get User Preferences for Prayers
        let prayerReminders = {
            fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
        };
        try {
            const savedReminders = await AsyncStorage.getItem('settings.prayer_reminders');
            if (savedReminders) {
                prayerReminders = JSON.parse(savedReminders);
            }
        } catch (e) {
            console.log('Error loading prayer reminders', e);
        }

        // 2. Fetch Supabase Notifications (General)
        let generalNotifications: NotificationItem[] = [];
        try {
            const { data, error } = await supabase
                .from('app_notifications')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (data && !error) {
                generalNotifications = data.map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    date: new Date(n.created_at),
                    type: n.type || 'info', // 'general', 'alert', 'info'
                    read: false // Logic for read status to be added
                }));
            }
        } catch (e) {
            console.log('Error fetching general notifications', e);
        }

        // 3. Generate Prayer Notifications (Simulated History)
        // Get Location
        let latitude = 41.0082;
        let longitude = 28.9784;
        
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
            }
        } catch (e) {
            console.log('Location error default to Istanbul', e);
        }

        const coordinates = new Coordinates(latitude, longitude);
        const params = CalculationMethod.Turkey();
        const generatedPrayerNotifications: NotificationItem[] = [];
        const now = new Date();

        // Specific prayer names map to ensure translation
        const prayerNames = {
            fajr: t('prayers.fajr'),
            dhuhr: t('prayers.dhuhr'),
            asr: t('prayers.asr'),
            maghrib: t('prayers.maghrib'),
            isha: t('prayers.isha')
        };

        // Generate for last 7 days
        for (let i = 0; i < 7; i++) {
            const date = subDays(now, i);
            const times = new PrayerTimes(coordinates, date, params);
            
            // Add prayers ONLY if enabled in settings
            const prayers = [
                { key: 'fajr', time: times.fajr, icon: '🌅' },
                { key: 'dhuhr', time: times.dhuhr, icon: '☀️' },
                { key: 'asr', time: times.asr, icon: '🌤️' },
                { key: 'maghrib', time: times.maghrib, icon: '🌇' },
                { key: 'isha', time: times.isha, icon: '🌌' },
            ].filter(p => prayerReminders[p.key as keyof typeof prayerReminders]); // FILTER HERE

            // Add Check-in notification (30 mins after Isha) - Always add unless logic changes
            const checkInTime = new Date(times.isha);
            checkInTime.setMinutes(checkInTime.getMinutes() + 30);
            
            if (checkInTime < now) {
                 generatedPrayerNotifications.push({
                    id: `checkin-${i}`,
                    title: "Günü Değerlendir 📝",
                    message: "Bugünkü ibadetlerini tamamladın mı? Kontrol etmek için dokun.",
                    date: checkInTime,
                    type: 'info',
                    read: true
                });
            }

            // Filter prayers that have passed
            prayers.forEach(p => {
                if (p.time < now) {
                    generatedPrayerNotifications.push({
                        id: `${p.key}-${i}`,
                        title: `${prayerNames[p.key as keyof typeof prayerNames]} Vakti ${p.icon}`,
                        message: `${prayerNames[p.key as keyof typeof prayerNames]} vakti girdi.`,
                        date: p.time,
                        type: 'prayer',
                        read: true
                    });
                }
            });
        }

        // 4. Merge
        const allNotifications = [...generalNotifications, ...generatedPrayerNotifications];

        // Sort by date descending
        allNotifications.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(allNotifications);
        

    };

    const getDateLocale = () => {
        switch (i18n.language) {
            case 'tr': return tr;
            case 'ar': return ar;
            default: return enUS;
        }
    };

    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return t('common.just_now');
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('common.minutes_ago')}`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('common.hours_ago')}`;
        
        return format(date, 'd MMM HH:mm', { locale: getDateLocale() });
    };

    return (
        <View className="flex-1 bg-emerald-deep">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-4 flex-row items-center border-b border-white/10">
                    <TouchableOpacity onPress={router.back} className="p-2 -ml-2">
                        <ChevronLeft color="#F5F0E1" size={24} />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-bold text-beige mr-8">
                        {t('settings.notifications')}
                    </Text>
                </View>

                <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
                    {notifications.length > 0 ? (
                        notifications.map((item, index) => (
                            <View 
                                key={item.id}
                                className="bg-emerald-card rounded-2xl p-4 mb-3 border border-white/5 flex-row gap-4"
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center ${
                                    item.type === 'prayer' ? 'bg-primary/20' : 'bg-orange-500/20'
                                }`}>
                                    {item.type === 'prayer' ? (
                                        <Clock size={20} color="#CD853F" />
                                    ) : (
                                        <CheckCircle2 size={20} color="#F97316" />
                                    )}
                                </View>
                                
                                <View className="flex-1">
                                    <View className="flex-row justify-between items-start mb-1">
                                        <Text className="text-beige font-bold text-sm flex-1 mr-2">
                                            {item.title}
                                        </Text>
                                        <Text className="text-beige/40 text-[10px]">
                                            {formatRelativeTime(item.date)}
                                        </Text>
                                    </View>
                                    <Text className="text-beige/70 text-xs leading-relaxed">
                                        {item.message}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="items-center justify-center py-20">
                             <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
                                <Bell size={40} color="rgba(245, 240, 225, 0.2)" />
                            </View>
                            <Text className="text-beige/50 text-center">
                                {t('common.no_notifications')}
                            </Text>
                        </View>
                    )}
                    
                     <View className="h-20" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
