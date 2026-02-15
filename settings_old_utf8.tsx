import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, Modal, TextInput, Platform, Alert } from 'react-native';
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

const PRAYER_TIMES = [
    { key: 'fajr', label: 'Sabah' },
    { key: 'dhuhr', label: '├û─şle' },
    { key: 'asr', label: '─░kindi' },
    { key: 'maghrib', label: 'Ak┼şam' },
    { key: 'isha', label: 'Yats─▒' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [profile, setProfile] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Profile Edit Modal
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [editedProfile, setEditedProfile] = useState({
        name: '',
        surname: '',
        email: '',
        birthDate: '',
        gender: 'male',
        bulughDate: '',
        profileImage: '',
    });

    // Date Pickers
    const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
    const [showBulughDatePicker, setShowBulughDatePicker] = useState(false);

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

    const handlePickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setEditedProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
            });

            // Check for navigation params to open modals
            if (params.action === 'openPrayerReminders') {
                setPrayerReminderModalVisible(true);
                router.setParams({ action: '' }); // Clear param
            }
        }, [params.action])
    );



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
                    profileImage: result.profile_image || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const db = getDb();
            console.log('Saving profile:', editedProfile); // Debug log
            
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
                        profile_image = ?
                    WHERE id = ?`,
                    [
                        editedProfile.name, 
                        editedProfile.surname, 
                        editedProfile.email, 
                        editedProfile.birthDate, 
                        editedProfile.gender, 
                        editedProfile.bulughDate, 
                        editedProfile.profileImage,
                        existing.id
                    ]
                );
            } else {
                // Should not happen if onboarding created it, but safe fallback
                await db.runAsync(
                    `INSERT INTO profile (name, surname, email, birth_date, gender, bulugh_date, profile_image) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        editedProfile.name, 
                        editedProfile.surname, 
                        editedProfile.email, 
                        editedProfile.birthDate, 
                        editedProfile.gender, 
                        editedProfile.bulughDate, 
                        editedProfile.profileImage
                    ]
                );
            }
            
            await fetchProfile();
            setProfileModalVisible(false);
            // Auto-sync profile changes
            SyncService.backupData();
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    };

    const toggleAllPrayerReminders = (enabled: boolean) => {
        setPrayerReminders({
            fajr: enabled,
            dhuhr: enabled,
            asr: enabled,
            maghrib: enabled,
            isha: enabled,
        });
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        const success = await SyncService.backupData();
        setIsBackingUp(false);
        if (success) {
            alert('Yedekleme Ba┼şar─▒l─▒!');
        }
    };

    const isAnyPrayerReminderEnabled = Object.values(prayerReminders).some(v => v);

    const handleResetData = () => {
        Alert.alert(
            'Verileri S─▒f─▒rla',
            'T├╝m yerel verileriniz (ibadet kay─▒tlar─▒, ayarlar) silinecek. Yedeklenmemi┼ş veriler kaybolur. Emin misiniz?',
            [
                { text: 'Vazge├ğ', style: 'cancel' },
                { 
                    text: 'S─▒f─▒rla', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            const db = getDb();
                            await db.runAsync('DELETE FROM daily_status');
                            await db.runAsync('DELETE FROM debt_counts');
                            await db.runAsync('DELETE FROM logs');
                            // We might keep the profile but reset stats? Or delete profile too?
                            // Usually "Reset Data" implies wiping user progress.
                            // Let's reset debts and status.
                            await db.runAsync('UPDATE debt_counts SET count = 0'); // Actually delete rows or reset?
                            // Re-init default debts
                            await db.runAsync('DELETE FROM debt_counts');
                            const types = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr', 'fasting'];
                            for (const type of types) {
                                await db.runAsync('INSERT INTO debt_counts (type, count) VALUES (?, 0)', [type]);
                            }
                            
                            // Clear profile last_processed_date to trigger recalc if needed, or just leave it.
                            alert('Veriler s─▒f─▒rland─▒.');
                            // Reload profile/stats
                            fetchProfile();
                        } catch (e) {
                            console.error(e);
                            alert('Hata olu┼ştu.');
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Oturumu Kapat',
            '├ç─▒k─▒┼ş yapmak istedi─şinize emin misiniz? Yerel verileriniz silinmez.',
            [
                { text: 'Vazge├ğ', style: 'cancel' },
                {
                    text: '├ç─▒k─▒┼ş Yap',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                             await supabase.auth.signOut();
                             setSession(null);
                             router.replace('/(tabs)/settings');
                        } catch (error) {
                             console.error('Logout error:', error);
                        }
                    }
                }
            ]
        );
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
                        Ayarlar
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
                                    <Text className="text-5xl text-beige/40">­şæñ</Text>
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
                                    ? `${profile.gender === 'male' ? 'Erkek' : 'Kad─▒n'} - ${format(new Date(profile.birth_date), 'd MMMM yyyy', { locale: tr })}`
                                    : 'Profil bilgisi eksik'}
                            </Text>
                        </View>
                    </View>

                    {/* HESAP VE VER─░ Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            HESAP VE VER─░
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            
                            {/* Auth Status / Backup */}
                            {session ? (
                                <View className="p-4 bg-primary/10 mb-1 border-b border-white/5">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-3">
                                            <Shield size={20} color="#CD853F" />
                                            <View>
                                                <Text className="text-beige font-semibold">Verileriniz G├╝vende Ô£à</Text>
                                                <Text className="text-xs text-beige/60">{session.user.email}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={handleBackup}
                                            disabled={isBackingUp}
                                            className="bg-primary/20 px-3 py-1.5 rounded-lg"
                                        >
                                            <Text className="text-xs font-medium text-primary">
                                                {isBackingUp ? 'Yedekleniyor...' : '┼Şimdi Yedekle'}
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
                                            <Text className="text-orange-400 font-semibold">Verileri Yedekle</Text>
                                            <Text className="text-xs text-orange-300/80">├£ye ol, verilerin kaybolmas─▒n.</Text>
                                        </View>
                                        <ChevronRight size={16} color="#F97316" className="ml-auto" />
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Ki┼şisel Bilgiler */}
                            <TouchableOpacity 
                                onPress={() => setProfileModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <User size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Ki┼şisel Bilgiler</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>

                            {/* Verileri S─▒f─▒rla (Existing) */
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
                                    <Text className="text-sm font-medium text-red-400">Verileri S─▒f─▒rla</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(239, 68, 68, 0.3)" />
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/* GENEL Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            GENEL
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {/* Bildirimler */}
                            <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Bell size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Bildirimler</Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={setNotificationsEnabled}
                                    trackColor={{ false: 'rgba(0, 0, 0, 0.4)', true: '#CD853F' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="rgba(0, 0, 0, 0.4)"
                                />
                            </View>

                            {/* Vakit Hat─▒rlat─▒c─▒ */}
                            <TouchableOpacity 
                                onPress={() => setPrayerReminderModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Clock size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Vakit Hat─▒rlat─▒c─▒</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs text-beige/50">
                                        {isAnyPrayerReminderEnabled ? 'Aktif' : 'Kapal─▒'}
                                    </Text>
                                    <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                                </View>
                            </TouchableOpacity>

                            {/* Dil */}
                            <TouchableOpacity className="flex-row items-center justify-between p-4">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Globe size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Dil</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs text-beige/50">T├╝rk├ğe</Text>
                                    <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>



                    {/* UYGULAMA Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            UYGULAMA
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {/* Hakk─▒nda */}
                            <TouchableOpacity 
                                onPress={() => setAboutModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Info size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Hakk─▒nda</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>

                            {/* Gizlilik Politikas─▒ */}
                            <TouchableOpacity 
                                onPress={() => setPrivacyModalVisible(true)}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Shield size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Gizlilik Politikas─▒</Text>
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
                        <Text className="text-sm font-bold text-primary">Oturumu Kapat</Text>
                    </TouchableOpacity>

                    {/* Version */}
                    <View className="items-center pb-8 mt-4">
                        <Text className="text-[10px] text-beige/30">Farz v2.4.0 (2024)</Text>
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
                            <Text className="text-xl font-bold text-beige">Profili D├╝zenle</Text>
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
                                            <Text className="text-5xl text-beige/40">­şæñ</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity 
                                        onPress={handlePickImage}
                                        className="absolute bottom-0 right-0 bg-primary p-2 rounded-full"
                                    >
                                        <Camera size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-xs text-beige/50 mt-2">Profil foto─şraf─▒ ekle</Text>
                            </View>

                            {/* Ad */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Ad</Text>
                                <TextInput
                                    value={editedProfile.name}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder="Ad─▒n─▒z"
                                />
                            </View>

                            {/* Soyad */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Soyad</Text>
                                <TextInput
                                    value={editedProfile.surname}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, surname: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder="Soyad─▒n─▒z"
                                />
                            </View>

                            {/* Email */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Email</Text>
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

                            {/* Do─şum Tarihi */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Do─şum Tarihi</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBirthDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.birthDate ? format(new Date(editedProfile.birthDate), 'd MMMM yyyy', { locale: tr }) : 'Tarih se├ğin'}
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
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Cinsiyet</Text>
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
                                            Erkek
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
                                            Kad─▒n
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Bulu─ş ├ça─ş─▒ Ba┼şlang─▒c─▒ */}
                            <View className="mb-6">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Bulu─ş ├ça─ş─▒ Ba┼şlang─▒c─▒</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBulughDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.bulughDate ? format(new Date(editedProfile.bulughDate), 'd MMMM yyyy', { locale: tr }) : 'Tarih se├ğin'}
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

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSaveProfile}
                                className="bg-primary py-4 rounded-2xl shadow-lg mb-4"
                            >
                                <Text className="text-beige font-bold text-center text-base">Kaydet</Text>
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
                            <Text className="text-xl font-bold text-beige">Vakit Hat─▒rlat─▒c─▒</Text>
                            <TouchableOpacity onPress={() => setPrayerReminderModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        {/* Toggle All */}
                        <View className="bg-emerald-card rounded-2xl p-4 mb-4 border border-white/5">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm font-bold text-beige">T├╝m├╝n├╝ {isAnyPrayerReminderEnabled ? 'Kapat' : 'A├ğ'}</Text>
                                <TouchableOpacity
                                    onPress={() => toggleAllPrayerReminders(!isAnyPrayerReminderEnabled)}
                                    className="bg-primary px-6 py-2 rounded-xl"
                                >
                                    <Text className="text-beige font-bold text-xs">
                                        {isAnyPrayerReminderEnabled ? 'Kapat' : 'A├ğ'}
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
                                    <Text className="text-sm font-medium text-beige">{prayer.label}</Text>
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
                                En az bir vakit a├ğ─▒k oldu─şunda hat─▒rlat─▒c─▒ aktif olur
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
                            <Text className="text-xl font-bold text-beige">Hakk─▒nda</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-lg font-bold text-beige mb-2">Farz Uygulamas─▒</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Farz, M├╝sl├╝manlar─▒n namaz ve oru├ğ bor├ğlar─▒n─▒ takip etmelerini kolayla┼şt─▒rmak i├ğin geli┼ştirilmi┼ş bir uygulamad─▒r.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">├ûzellikler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        ÔÇó Namaz ve oru├ğ bor├ğlar─▒n─▒z─▒ kolayca takip edin{"\n"}
                                        ÔÇó G├╝nl├╝k, haftal─▒k ve ayl─▒k istatistiklerinizi g├Âr├╝nt├╝leyin{"\n"}
                                        ÔÇó Vakit hat─▒rlat─▒c─▒lar─▒ ile ibadetlerinizi aksatmay─▒n{"\n"}
                                        ÔÇó Ge├ğmi┼ş kay─▒tlar─▒n─▒z─▒ d├╝zenleyin ve y├Ânetin{"\n"}
                                        ÔÇó Tahmini tamamlanma tarihini ├Â─şrenin
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">─░leti┼şim</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Sorular─▒n─▒z ve ├Ânerileriniz i├ğin:{"\n"}
                                        destek@farzapp.com
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        Farz v2.4.0 (2024){"\n"}
                                        ┬® 2024 T├╝m haklar─▒ sakl─▒d─▒r.
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
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
                            <Text className="text-xl font-bold text-beige">Gizlilik Politikas─▒</Text>
                            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri Toplama</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Farz uygulamas─▒, yaln─▒zca sizin taraf─▒n─▒zdan girilen ki┼şisel bilgileri (ad, soyad, do─şum tarihi, cinsiyet) ve ibadet kay─▒tlar─▒n─▒z─▒ cihaz─▒n─▒zda yerel olarak saklar. Bu veriler hi├ğbir ┼şekilde ├╝├ğ├╝nc├╝ taraflarla payla┼ş─▒lmaz.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri G├╝venli─şi</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        T├╝m verileriniz cihaz─▒n─▒z─▒n yerel veritaban─▒nda ┼şifrelenmi┼ş olarak saklan─▒r. Uygulama, internet ba─şlant─▒s─▒ gerektirmez ve verileriniz yaln─▒zca sizin kontrol├╝n├╝zdedir.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Bildirimler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Vakit hat─▒rlat─▒c─▒lar─▒ i├ğin yerel bildirimler kullan─▒l─▒r. Bu bildirimler yaln─▒zca cihaz─▒n─▒zda olu┼şturulur ve hi├ğbir veri d─▒┼şar─▒ya g├Ânderilmez.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri Silme</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Ayarlar men├╝s├╝nden "Verileri S─▒f─▒rla" se├ğene─şini kullanarak t├╝m verilerinizi kal─▒c─▒ olarak silebilirsiniz. Bu i┼şlem geri al─▒namaz.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">De─şi┼şiklikler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Bu gizlilik politikas─▒ zaman zaman g├╝ncellenebilir. ├ûnemli de─şi┼şiklikler oldu─şunda uygulama i├ğinde bilgilendirileceksiniz.
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        Son g├╝ncelleme: 12 ┼Şubat 2026
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
