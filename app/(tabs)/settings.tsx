import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, Modal, TextInput, Platform, Alert, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { 
    ChevronLeft, ChevronRight, Bell, Globe, 
    CloudUpload, Trash2, Info, Shield, Edit, LogOut, X, Clock, Camera, User
} from 'lucide-react-native';
import { getDb } from '@/db';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { SyncService } from '@/services/SyncService';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '@/components/CustomAlert';
import { calculatePrayerDebt, calculateFastingDebt } from '@/lib/calculations';
import { differenceInDays } from 'date-fns';

const PRAYER_TIMES = [
    { key: 'fajr', label: 'Sabah' },
    { key: 'dhuhr', label: 'Öğle' },
    { key: 'asr', label: 'İkindi' },
    { key: 'maghrib', label: 'Akşam' },
    { key: 'isha', label: 'Yatsı' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t, i18n } = useTranslation();
    const [profile, setProfile] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    
    // Load General Notifications Setting
    useEffect(() => {
        AsyncStorage.getItem('settings.general_notifications').then(value => {
            if (value !== null) {
                setNotificationsEnabled(value === 'true');
            }
        });
    }, []);

    const toggleGeneralNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('settings.general_notifications', String(value));
    };
    
    // Recalculation States
    const [initialProfile, setInitialProfile] = useState<any>(null);
    const [recalcAlertVisible, setRecalcAlertVisible] = useState(false);
    const [changesToRecalc, setChangesToRecalc] = useState<{prayer: boolean, fasting: boolean}>({ prayer: false, fasting: false });

    // Profile Edit Modal
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [editedProfile, setEditedProfile] = useState({
        name: '',
        surname: '',
        email: '',
        birthDate: '',
        gender: 'male',
        bulughDate: '',
        regularStartDate: '',
        fastingStartDate: '',
        profileImage: '',
    });

    // Date Pickers
    const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
    const [showBulughDatePicker, setShowBulughDatePicker] = useState(false);
    const [showRegularStartDatePicker, setShowRegularStartDatePicker] = useState(false);
    const [showFastingStartDatePicker, setShowFastingStartDatePicker] = useState(false);
    
    // Language Modal
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    // Info Modals
    const [aboutModalVisible, setAboutModalVisible] = useState(false);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

    // Prayer Reminders
    const [prayerReminderModalVisible, setPrayerReminderModalVisible] = useState(false);
    const [prayerReminders, setPrayerReminders] = useState({
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
    });

    // Custom Alerts
    const [resetDataAlertVisible, setResetDataAlertVisible] = useState(false);
    const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);

    const [statusAlert, setStatusAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'danger' | 'warning' | 'info';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    const handlePickImage = async () => {
        const mediaTypes = (ImagePicker as any).MediaType 
            ? (ImagePicker as any).MediaType.Images 
            : ImagePicker.MediaTypeOptions.Images;

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setEditedProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        }
    };

    const changeLanguage = async (lang: string) => {
        try {
            await i18n.changeLanguage(lang);
            await AsyncStorage.setItem('user-language', lang);
            I18nManager.forceRTL(lang === 'ar');
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const fetchProfile = async () => {
        try {
            const db = getDb();
            const result: any = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
            console.log('Fetched profile:', result); // Debug log
            setProfile(result);
            if (result) {
                setEditedProfile({
                    name: result.name || '',
                    surname: result.surname || '',
                    email: result.email || '',
                    birthDate: result.birth_date || '',
                    gender: result.gender || 'male',
                    bulughDate: result.bulugh_date || '',
                    regularStartDate: result.regular_start_date || '',
                    fastingStartDate: result.fasting_start_date || '',
                    profileImage: result.profile_image || '',
                });
                setInitialProfile({
                    regularStartDate: result.regular_start_date || '',
                    fastingStartDate: result.fasting_start_date || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
            
            AsyncStorage.getItem('user-language').then(lang => {
                if (lang) {
                    i18n.changeLanguage(lang);
                }
            });
        }, [])
    );

    const processSaveProfile = async (shouldRecalc: boolean) => {
        try {
            const db = getDb();
            console.log('Saving profile:', editedProfile);
            
            // Check if profile exists
            const existing: any = await db.getFirstAsync('SELECT id FROM profile LIMIT 1');
            
            if (existing) {
                await db.runAsync(
                    `UPDATE profile SET 
                        name = ?, 
                        surname = ?, 
                        email = ?,
                        birth_date = ?, 
                        gender = ?, 
                        bulugh_date = ?,
                        regular_start_date = ?,
                        fasting_start_date = ?,
                        profile_image = ?
                    WHERE id = ?`,
                    [
                        editedProfile.name, 
                        editedProfile.surname, 
                        editedProfile.email, 
                        editedProfile.birthDate, 
                        editedProfile.gender, 
                        editedProfile.bulughDate, 
                        editedProfile.regularStartDate,
                        editedProfile.fastingStartDate,
                        editedProfile.profileImage,
                        existing.id
                    ]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO profile (name, surname, email, birth_date, gender, bulugh_date, regular_start_date, fasting_start_date, profile_image) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        editedProfile.name, 
                        editedProfile.surname, 
                        editedProfile.email, 
                        editedProfile.birthDate, 
                        editedProfile.gender, 
                        editedProfile.bulughDate, 
                        editedProfile.regularStartDate,
                        editedProfile.fastingStartDate,
                        editedProfile.profileImage
                    ]
                );
            }
            
            // Recalculation Logic
            if (shouldRecalc) {
                const bulughDate = new Date(editedProfile.bulughDate);
                
                if (changesToRecalc.prayer) {
                    const regularStartDate = new Date(editedProfile.regularStartDate);
                    const newPrayerDebt = calculatePrayerDebt(bulughDate, regularStartDate);
                    
                    // Reset Prayer Progress
                    await db.runAsync(`DELETE FROM daily_status WHERE type IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')`);
                    
                    // Update Prayer Debts
                    const prayerTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
                    for (const type of prayerTypes) {
                        await db.runAsync(
                            'INSERT OR REPLACE INTO debt_counts (type, count) VALUES (?, ?)',
                            [type, newPrayerDebt]
                        );
                    }
                }
                
                if (changesToRecalc.fasting) {
                    const fastingStartDate = new Date(editedProfile.fastingStartDate);
                    const newFastingDebt = calculateFastingDebt(bulughDate, fastingStartDate);
                    
                    // Reset Fasting Progress
                    await db.runAsync(`DELETE FROM daily_status WHERE type = 'fasting'`);
                    
                    // Update Fasting Debt
                    await db.runAsync(
                        'INSERT OR REPLACE INTO debt_counts (type, count) VALUES (?, ?)',
                        ['fasting', newFastingDebt]
                    );
                }
            }
            
            await fetchProfile();
            setProfileModalVisible(false);
            // Auto-sync profile changes
            SyncService.backupData();
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    };

    const handleSaveProfile = async () => {
        const prayerChanged = initialProfile?.regularStartDate !== editedProfile.regularStartDate;
        const fastingChanged = initialProfile?.fastingStartDate !== editedProfile.fastingStartDate;
        
        if (prayerChanged || fastingChanged) {
            setChangesToRecalc({ prayer: prayerChanged, fasting: fastingChanged });
            setRecalcAlertVisible(true);
        } else {
            processSaveProfile(false);
        }
    };

    // Load Prayer Reminders
    useEffect(() => {
        AsyncStorage.getItem('settings.prayer_reminders').then(value => {
            if (value) {
                setPrayerReminders(JSON.parse(value));
            }
        });
    }, []);

    const savePrayerReminders = async (newReminders: typeof prayerReminders) => {
        setPrayerReminders(newReminders);
        await AsyncStorage.setItem('settings.prayer_reminders', JSON.stringify(newReminders));
        
        // Reschedule notifications with new settings
        // We need to get current location to reschedule. 
        // For now, we'll just invalidate. ideally we'd call NotificationService.schedule here if we had location.
        // It will be rescheduled on next app open or dashboard load.
    };

    const toggleAllPrayerReminders = (enabled: boolean) => {
        const newReminders = {
            fajr: enabled,
            dhuhr: enabled,
            asr: enabled,
            maghrib: enabled,
            isha: enabled,
        };
        savePrayerReminders(newReminders);
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        const result = await SyncService.backupData();
        setIsBackingUp(false);
        
        if (result.success) {
            setStatusAlert({
                visible: true,
                title: t('common.success'),
                message: t('settings.backup_success'),
                type: 'success',
            });
        } else {
            setStatusAlert({
                visible: true,
                title: t('common.error'),
                message: result.message || t('common.error_occurred'),
                type: 'danger',
            });
        }
    };

    const isAnyPrayerReminderEnabled = Object.values(prayerReminders).some(v => v);

    const handleResetData = () => {
        setResetDataAlertVisible(true);
    };

    const confirmResetData = async () => {
        try {
            const db = getDb();
            // Full wipe including profile
            await db.runAsync('DELETE FROM daily_status');
            await db.runAsync('DELETE FROM debt_counts');
            await db.runAsync('DELETE FROM logs');
            await db.runAsync('DELETE FROM profile');
            
            setResetDataAlertVisible(false);
            // Redirect to onboarding to start fresh
            router.replace('/onboarding');
        } catch (e) {
            console.error(e);
            alert(t('common.error_occurred'));
            setResetDataAlertVisible(false);
        }
    };

    const handleLogout = () => {
        setLogoutAlertVisible(true);
    };

    const confirmLogout = async () => {
        try {
                await supabase.auth.signOut();
                setSession(null);
                
                // Clear local data to prevent mixing with next user
                const db = getDb();
                await db.runAsync('DELETE FROM daily_status');
                await db.runAsync('DELETE FROM debt_counts');
                await db.runAsync('DELETE FROM logs');
                await db.runAsync('DELETE FROM profile');

                setLogoutAlertVisible(false);
                router.replace('/onboarding');
        } catch (error) {
                console.error('Logout error:', error);
                setLogoutAlertVisible(false);
        }
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
                        {t('common.settings')}
                    </Text>
                </View>

                <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
                    {/* Profile Section */}
                    <View className="flex-col items-center gap-3 py-2 mb-8">
                        <View className="relative">
                            <View className="w-24 h-24 rounded-full bg-emerald-card border-2 border-primary/30 items-center justify-center overflow-hidden">
                                {profile?.profile_image ? (
                                    <Image source={{ uri: profile.profile_image }} className="w-full h-full" />
                                ) : (
                                    <Text className="text-5xl text-beige/40">👤</Text>
                                )}
                            </View>
                            <TouchableOpacity 
                                onPress={() => setProfileModalVisible(true)}
                                className="absolute bottom-0 right-0 bg-primary p-2 rounded-full shadow-lg"
                            >
                                <Edit size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View className="items-center">
                            <Text className="text-xl font-bold text-beige">
                                {profile?.name ? `${profile.name} ${profile.surname || ''}`.trim() : 'Profil Bilgisi Yok'}
                            </Text>
                            <Text className="text-xs text-beige/60">
                                {profile?.birth_date 
                                    ? `${profile.gender === 'male' ? 'Erkek' : 'Kadın'} - ${format(new Date(profile.birth_date), 'd MMMM yyyy', { locale: tr })}`
                                    : 'Profil bilgisi eksik'}
                            </Text>
                        </View>
                    </View>

                    {/* HESAP VE VERİ Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            {t('settings.account')}
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            
                            {/* Auth Status / Backup */}
                            {session ? (
                                <View className="p-4 bg-primary/10 mb-1 border-b border-white/5">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-3">
                                            <Shield size={20} color="#CD853F" />
                                            <View>
                                                <Text className="text-beige font-semibold">{t('settings.data_safe')}</Text>
                                                <Text className="text-xs text-beige/60">{session.user.email}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={handleBackup}
                                            disabled={isBackingUp}
                                            className="bg-primary/20 px-3 py-1.5 rounded-lg"
                                        >
                                            <Text className="text-xs font-medium text-primary">
                                                {isBackingUp ? t('settings.backing_up') : t('settings.backup_now')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => router.push('/auth/login')}
                                    className="p-4 bg-orange-500/10 mb-1 border-b border-white/5"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <CloudUpload size={20} color="#F97316" />
                                        <View>
                                            <Text className="text-orange-400 font-semibold">{t('settings.backup')}</Text>
                                            <Text className="text-xs text-orange-300/80">{t('settings.signup_suggestion')}</Text>
                                        </View>
                                        <ChevronRight size={16} color="#F97316" className="ml-auto" />
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Kişisel Bilgiler */}
                            <TouchableOpacity 
                                onPress={() => setProfileModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <User size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.personal_info')}</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>

                            {/* Verileri Sıfırla (Existing) */
                              /* Moving Reset Data here as well if not already present or remove duplicates later */
                            }
                             <TouchableOpacity 
                                onPress={handleResetData}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center">
                                        <Trash2 size={20} color="#EF4444" />
                                    </View>
                                    <Text className="text-sm font-medium text-red-400">{t('settings.reset_data')}</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(239, 68, 68, 0.3)" />
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/* GENEL Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            {t('settings.general')}
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {/* Bildirimler */}
                            <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Bell size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.notifications')}</Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={toggleGeneralNotifications}
                                    trackColor={{ false: 'rgba(0, 0, 0, 0.4)', true: '#CD853F' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="rgba(0, 0, 0, 0.4)"
                                />
                            </View>

                            {/* Vakit Hatırlatıcı */}
                            <TouchableOpacity 
                                onPress={() => setPrayerReminderModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Clock size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.prayer_reminder')}</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs text-beige/50">
                                        {isAnyPrayerReminderEnabled ? t('settings.active') : t('settings.inactive')}
                                    </Text>
                                    <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                                </View>
                            </TouchableOpacity>

                            {/* Dil */}
                            <TouchableOpacity 
                                onPress={() => setLanguageModalVisible(true)}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Globe size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.language')}</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs text-beige/50">
                                        {i18n.language === 'tr' ? 'Türkçe' : i18n.language === 'en' ? 'English' : 'العربية'}
                                    </Text>
                                    <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>



                    {/* UYGULAMA Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            {t('settings.application')}
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {/* Hakkında */}
                            <TouchableOpacity 
                                onPress={() => setAboutModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Info size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.about')}</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>

                            {/* Gizlilik Politikası */}
                            <TouchableOpacity 
                                onPress={() => setPrivacyModalVisible(true)}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Shield size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">{t('settings.privacy_policy')}</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity 
                        onPress={handleLogout}
                        className="w-full py-4 items-center"
                    >
                        <Text className="text-sm font-bold text-primary">{t('settings.logout')}</Text>
                    </TouchableOpacity>

                    {/* Version */}
                    <View className="items-center pb-8 mt-4">
                        <Text className="text-[10px] text-beige/30">Farz v1.0.0 ({new Date().getFullYear()})</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Profile Edit Modal */}
            <Modal
                visible={profileModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-emerald-deep rounded-t-3xl p-6 max-h-[80%]">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-beige">{t('settings.edit_profile')}</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Profile Image */}
                            <View className="mb-6 items-center">
                                <View className="relative">
                                    <View className="w-24 h-24 rounded-full bg-emerald-card border-2 border-primary/30 items-center justify-center overflow-hidden">
                                        {editedProfile.profileImage ? (
                                            <Image source={{ uri: editedProfile.profileImage }} className="w-full h-full" />
                                        ) : (
                                            <Text className="text-5xl text-beige/40">👤</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity 
                                        onPress={handlePickImage}
                                        className="absolute bottom-0 right-0 bg-primary p-2 rounded-full"
                                    >
                                        <Camera size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-xs text-beige/50 mt-2">{t('settings.add_profile_photo')}</Text>
                            </View>

                            {/* Ad */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.name')}</Text>
                                <TextInput
                                    value={editedProfile.name}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder={t('settings.name_placeholder')}
                                />
                            </View>

                            {/* Soyad */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.surname')}</Text>
                                <TextInput
                                    value={editedProfile.surname}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, surname: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder={t('settings.surname_placeholder')}
                                />
                            </View>

                            {/* Email */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.email')}</Text>
                                <TextInput
                                    value={editedProfile.email}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, email: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder="ornek@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Doğum Tarihi */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.birth_date')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBirthDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.birthDate ? format(new Date(editedProfile.birthDate), 'd MMMM yyyy', { locale: tr }) : t('settings.select_date')}
                                    </Text>
                                </TouchableOpacity>
                                {showBirthDatePicker && (
                                    <DateTimePicker
                                        value={editedProfile.birthDate ? new Date(editedProfile.birthDate) : new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowBirthDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setEditedProfile({ ...editedProfile, birthDate: selectedDate.toISOString().split('T')[0] });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {/* Cinsiyet */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.gender')}</Text>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setEditedProfile({ ...editedProfile, gender: 'male' })}
                                        className="flex-1 p-4 rounded-xl border"
                                        style={{
                                            backgroundColor: editedProfile.gender === 'male' ? '#CD853F' : '#065F46',
                                            borderColor: editedProfile.gender === 'male' ? 'rgba(205, 133, 63, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        }}
                                    >
                                        <Text className="text-center font-bold" style={{ color: editedProfile.gender === 'male' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>
                                            {t('settings.male')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setEditedProfile({ ...editedProfile, gender: 'female' })}
                                        className="flex-1 p-4 rounded-xl border"
                                        style={{
                                            backgroundColor: editedProfile.gender === 'female' ? '#CD853F' : '#065F46',
                                            borderColor: editedProfile.gender === 'female' ? 'rgba(205, 133, 63, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        }}
                                    >
                                        <Text className="text-center font-bold" style={{ color: editedProfile.gender === 'female' ? '#F5F0E1' : 'rgba(245, 240, 225, 0.6)' }}>
                                            {t('settings.female')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Buluğ Çağı Başlangıcı */}
                            <View className="mb-6">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.bulugh_date')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBulughDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.bulughDate ? format(new Date(editedProfile.bulughDate), 'd MMMM yyyy', { locale: tr }) : t('settings.select_date')}
                                    </Text>
                                </TouchableOpacity>
                                {showBulughDatePicker && (
                                    <DateTimePicker
                                        value={editedProfile.bulughDate ? new Date(editedProfile.bulughDate) : new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowBulughDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setEditedProfile({ ...editedProfile, bulughDate: selectedDate.toISOString().split('T')[0] });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {/* Düzenli Namaz Başlangıcı */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.regular_start_date')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowRegularStartDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.regularStartDate ? format(new Date(editedProfile.regularStartDate), 'd MMMM yyyy', { locale: tr }) : t('settings.select_date')}
                                    </Text>
                                </TouchableOpacity>
                                {showRegularStartDatePicker && (
                                    <DateTimePicker
                                        value={editedProfile.regularStartDate ? new Date(editedProfile.regularStartDate) : new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowRegularStartDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setEditedProfile({ ...editedProfile, regularStartDate: selectedDate.toISOString().split('T')[0] });
                                            }
                                        }}
                                    />
                                )}
                                <Text className="text-orange-400/80 text-[10px] mt-2 leading-tight">
                                    {t('settings.recalc_warning')}
                                </Text>
                            </View>

                            {/* Düzenli Oruç Başlangıcı */}
                            <View className="mb-6">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">{t('settings.fasting_start_date')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowFastingStartDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.fastingStartDate ? format(new Date(editedProfile.fastingStartDate), 'd MMMM yyyy', { locale: tr }) : t('settings.select_date')}
                                    </Text>
                                </TouchableOpacity>
                                {showFastingStartDatePicker && (
                                    <DateTimePicker
                                        value={editedProfile.fastingStartDate ? new Date(editedProfile.fastingStartDate) : new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowFastingStartDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setEditedProfile({ ...editedProfile, fastingStartDate: selectedDate.toISOString().split('T')[0] });
                                            }
                                        }}
                                    />
                                )}
                                <Text className="text-orange-400/80 text-[10px] mt-2 leading-tight">
                                    {t('settings.recalc_warning')}
                                </Text>
                            </View>

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSaveProfile}
                                className="bg-primary py-4 rounded-2xl shadow-lg mb-4"
                            >
                                <Text className="text-beige font-bold text-center text-base">{t('common.save')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Prayer Reminder Modal */}
            <Modal
                visible={prayerReminderModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPrayerReminderModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-emerald-deep rounded-t-3xl p-6">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-beige">{t('settings.prayer_reminder_title')}</Text>
                            <TouchableOpacity onPress={() => setPrayerReminderModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        {/* Toggle All */}
                        <View className="bg-emerald-card rounded-2xl p-4 mb-4 border border-white/5">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm font-bold text-beige">{isAnyPrayerReminderEnabled ? t('settings.toggle_all_off_full') : t('settings.toggle_all_on_full')}</Text>
                                <TouchableOpacity
                                    onPress={() => toggleAllPrayerReminders(!isAnyPrayerReminderEnabled)}
                                    className="bg-primary px-6 py-2 rounded-xl"
                                >
                                    <Text className="text-beige font-bold text-xs">
                                        {isAnyPrayerReminderEnabled ? t('settings.toggle_all_off') : t('settings.toggle_all_on')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Individual Prayer Toggles */}
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
            {PRAYER_TIMES.map((prayer, index) => (
                                <View
                                    key={prayer.key}
                                    className="flex-row items-center justify-between p-4"
                                    style={{
                                        borderBottomWidth: index < PRAYER_TIMES.length - 1 ? 1 : 0,
                                        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
                                    }}
                                >
                                    <Text className="text-sm font-medium text-beige">{t(`prayers.${prayer.key}`)}</Text>
                                    <Switch
                                        value={prayerReminders[prayer.key as keyof typeof prayerReminders]}
                                        onValueChange={(value) =>
                                            setPrayerReminders({ ...prayerReminders, [prayer.key]: value })
                                        }
                                        trackColor={{ false: 'rgba(0, 0, 0, 0.4)', true: '#CD853F' }}
                                        thumbColor="#FFFFFF"
                                        ios_backgroundColor="rgba(0, 0, 0, 0.4)"
                                    />
                                </View>
                            ))}
                        </View>

                        <View className="mt-4">
                            <Text className="text-xs text-beige/50 text-center">
                                {t('settings.reminder_info')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* About Modal */}
            <Modal
                visible={aboutModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAboutModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-emerald-deep rounded-t-3xl p-6 max-h-[80%]">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-beige">{t('settings.about')}</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-lg font-bold text-beige mb-2">{t('settings.about_app_name')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.about_description')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.features')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.features_list')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.backup')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.backup_restore_desc')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.contact')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.contact_text')}
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        Farz v1.0.0 ({new Date().getFullYear()}){"\n"}
                                        {t('settings.copyright', { year: new Date().getFullYear() })}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={languageModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-emerald-deep rounded-t-3xl p-6">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-beige">{t('settings.language')}</Text>
                            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>
                        
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {['tr', 'en', 'ar'].map((lang, index) => (
                                <TouchableOpacity 
                                    key={lang}
                                    onPress={() => {
                                        changeLanguage(lang);
                                        setLanguageModalVisible(false);
                                    }}
                                    className="flex-row items-center justify-between p-4 border-b border-white/5 last:border-b-0"
                                    style={{ borderBottomWidth: index === 2 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                                >
                                    <Text className={`text-base font-semibold ${i18n.language === lang ? 'text-primary' : 'text-beige'}`}>
                                        {lang === 'tr' ? 'Türkçe' : lang === 'en' ? 'English' : 'العربية'}
                                    </Text>
                                    {i18n.language === lang && <View className="w-3 h-3 rounded-full bg-primary" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                visible={privacyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPrivacyModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-emerald-deep rounded-t-3xl p-6 max-h-[80%]">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl font-bold text-beige">{t('settings.privacy_policy')}</Text>
                            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.privacy_data_collection')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.privacy_data_collection_text')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.privacy_security')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.privacy_security_text')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.privacy_notifications')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.privacy_notifications_text')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.privacy_data_deletion')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.privacy_data_deletion_text')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.prayer_reminder')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.prayer_reminder_desc')}
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">{t('settings.privacy_changes')}</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        {t('settings.privacy_changes_text')}
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        {t('settings.privacy_last_updated')}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Reset Data Alert */}
            <CustomAlert
                visible={resetDataAlertVisible}
                title={t('settings.reset_data_title')}
                message={t('settings.reset_data_confirm')}
                confirmText={t('settings.reset_data')}
                cancelText={t('common.cancel')}
                onConfirm={confirmResetData}
                onCancel={() => setResetDataAlertVisible(false)}
                type="danger"
                showCancel={true}
            />

            {/* Logout Alert */}
            <CustomAlert
                visible={logoutAlertVisible}
                title={t('settings.logout_title')}
                message={t('settings.logout_confirm')}
                confirmText={t('settings.logout')}
                cancelText={t('common.cancel')}
                onConfirm={confirmLogout}
                onCancel={() => setLogoutAlertVisible(false)}
                type="danger"
                showCancel={true}
            />

            {/* General Status Alert */}
            <CustomAlert
                visible={statusAlert.visible}
                title={statusAlert.title}
                message={statusAlert.message}
                confirmText={t('common.confirm')} 
                onConfirm={() => setStatusAlert({ ...statusAlert, visible: false })}
                onCancel={() => setStatusAlert({ ...statusAlert, visible: false })}
                type={statusAlert.type}
                showCancel={false}
            />

            {/* Recalculation Alert */}
            <CustomAlert
                visible={recalcAlertVisible}
                title={t('settings.recalc_title')}
                message={t('settings.recalc_message')}
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
                onConfirm={() => {
                    setRecalcAlertVisible(false);
                    processSaveProfile(true);
                }}
                onCancel={() => {
                    setRecalcAlertVisible(false);
                }}
                type="warning"
                showCancel={true}
            />
        </View>
    );
}
