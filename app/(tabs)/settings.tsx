import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, ChevronRight, Bell, Globe, 
    CloudUpload, Trash2, Info, Shield, Edit, LogOut, X, Clock, Camera
} from 'lucide-react-native';
import { getDb } from '@/db';
import DateTimePicker from '@react-native-community/datetimepicker';

const PRAYER_TIMES = [
    { key: 'fajr', label: 'Sabah' },
    { key: 'dhuhr', label: 'Öğle' },
    { key: 'asr', label: 'İkindi' },
    { key: 'maghrib', label: 'Akşam' },
    { key: 'isha', label: 'Yatsı' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    
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

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const db = getDb();
            const result: any = await db.getFirstAsync('SELECT * FROM profile LIMIT 1');
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
            await db.runAsync(
                `UPDATE profile SET 
                    name = ?, 
                    surname = ?, 
                    email = ?,
                    birth_date = ?, 
                    gender = ?, 
                    bulugh_date = ?,
                    profile_image = ?
                WHERE id = 1`,
                [editedProfile.name, editedProfile.surname, editedProfile.email, editedProfile.birthDate, editedProfile.gender, editedProfile.bulughDate, editedProfile.profileImage]
            );
            await fetchProfile();
            setProfileModalVisible(false);
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

    const isAnyPrayerReminderEnabled = Object.values(prayerReminders).some(v => v);

    const handleResetData = () => {
        // TODO: Implement reset data functionality
        console.log('Reset data');
    };

    const handleLogout = async () => {
        try {
            const db = getDb();
            // Clear profile data
            await db.runAsync('DELETE FROM profile');
            // Navigate to onboarding
            router.replace('/onboarding');
        } catch (error) {
            console.error('Logout error:', error);
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
                                {profile?.birth_date || 'Doğum tarihi girilmemiş'}
                            </Text>
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

                            {/* Vakit Hatırlatıcı */}
                            <TouchableOpacity 
                                onPress={() => setPrayerReminderModalVisible(true)}
                                className="flex-row items-center justify-between p-4 border-b border-white/5"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <Clock size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Vakit Hatırlatıcı</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs text-beige/50">
                                        {isAnyPrayerReminderEnabled ? 'Aktif' : 'Kapalı'}
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
                                    <Text className="text-xs text-beige/50">Türkçe</Text>
                                    <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* HESAP VE VERİ Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            HESAP VE VERİ
                        </Text>
                        <View className="bg-emerald-card rounded-2xl overflow-hidden border border-white/5">
                            {/* Verileri Yedekle */}
                            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-white/5">
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                        <CloudUpload size={20} color="#CD853F" />
                                    </View>
                                    <Text className="text-sm font-medium text-beige">Verileri Yedekle</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(245, 240, 225, 0.3)" />
                            </TouchableOpacity>

                            {/* Verileri Sıfırla */}
                            <TouchableOpacity 
                                onPress={handleResetData}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-lg bg-red-500/10 items-center justify-center">
                                        <Trash2 size={20} color="#EF4444" />
                                    </View>
                                    <Text className="text-sm font-medium text-red-400">Verileri Sıfırla</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(239, 68, 68, 0.3)" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* UYGULAMA Section */}
                    <View className="mb-8">
                        <Text className="text-xs font-semibold text-beige uppercase tracking-widest px-1 mb-2">
                            UYGULAMA
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
                                    <Text className="text-sm font-medium text-beige">Hakkında</Text>
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
                                    <Text className="text-sm font-medium text-beige">Gizlilik Politikası</Text>
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
                            <Text className="text-xl font-bold text-beige">Profili Düzenle</Text>
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
                                    <TouchableOpacity className="absolute bottom-0 right-0 bg-primary p-2 rounded-full">
                                        <Camera size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-xs text-beige/50 mt-2">Profil fotoğrafı ekle</Text>
                            </View>

                            {/* Ad */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Ad</Text>
                                <TextInput
                                    value={editedProfile.name}
                                    onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4 text-beige"
                                    placeholderTextColor="rgba(245, 240, 225, 0.3)"
                                    placeholder="Adınız"
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
                                    placeholder="Soyadınız"
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

                            {/* Doğum Tarihi */}
                            <View className="mb-4">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Doğum Tarihi</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBirthDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.birthDate || 'Tarih seçin'}
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
                                            Kadın
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Buluğ Çağı Başlangıcı */}
                            <View className="mb-6">
                                <Text className="text-xs font-semibold text-beige/60 uppercase mb-2">Buluğ Çağı Başlangıcı</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBulughDatePicker(true)}
                                    className="bg-emerald-card border border-white/10 rounded-xl p-4"
                                >
                                    <Text className="text-beige">
                                        {editedProfile.bulughDate || 'Tarih seçin'}
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
                            <Text className="text-xl font-bold text-beige">Vakit Hatırlatıcı</Text>
                            <TouchableOpacity onPress={() => setPrayerReminderModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        {/* Toggle All */}
                        <View className="bg-emerald-card rounded-2xl p-4 mb-4 border border-white/5">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm font-bold text-beige">Tümünü {isAnyPrayerReminderEnabled ? 'Kapat' : 'Aç'}</Text>
                                <TouchableOpacity
                                    onPress={() => toggleAllPrayerReminders(!isAnyPrayerReminderEnabled)}
                                    className="bg-primary px-6 py-2 rounded-xl"
                                >
                                    <Text className="text-beige font-bold text-xs">
                                        {isAnyPrayerReminderEnabled ? 'Kapat' : 'Aç'}
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
                                En az bir vakit açık olduğunda hatırlatıcı aktif olur
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
                            <Text className="text-xl font-bold text-beige">Hakkında</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-lg font-bold text-beige mb-2">Farz Uygulaması</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Farz, Müslümanların namaz ve oruç borçlarını takip etmelerini kolaylaştırmak için geliştirilmiş bir uygulamadır.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Özellikler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        • Namaz ve oruç borçlarınızı kolayca takip edin{"\n"}
                                        • Günlük, haftalık ve aylık istatistiklerinizi görüntüleyin{"\n"}
                                        • Vakit hatırlatıcıları ile ibadetlerinizi aksatmayın{"\n"}
                                        • Geçmiş kayıtlarınızı düzenleyin ve yönetin{"\n"}
                                        • Tahmini tamamlanma tarihini öğrenin
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">İletişim</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Sorularınız ve önerileriniz için:{"\n"}
                                        destek@farzapp.com
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        Farz v2.4.0 (2024){"\n"}
                                        © 2024 Tüm hakları saklıdır.
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
                            <Text className="text-xl font-bold text-beige">Gizlilik Politikası</Text>
                            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                                <X size={24} color="#F5F0E1" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri Toplama</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Farz uygulaması, yalnızca sizin tarafınızdan girilen kişisel bilgileri (ad, soyad, doğum tarihi, cinsiyet) ve ibadet kayıtlarınızı cihazınızda yerel olarak saklar. Bu veriler hiçbir şekilde üçüncü taraflarla paylaşılmaz.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri Güvenliği</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Tüm verileriniz cihazınızın yerel veritabanında şifrelenmiş olarak saklanır. Uygulama, internet bağlantısı gerektirmez ve verileriniz yalnızca sizin kontrolünüzdedir.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Bildirimler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Vakit hatırlatıcıları için yerel bildirimler kullanılır. Bu bildirimler yalnızca cihazınızda oluşturulur ve hiçbir veri dışarıya gönderilmez.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Veri Silme</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Ayarlar menüsünden "Verileri Sıfırla" seçeneğini kullanarak tüm verilerinizi kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.
                                    </Text>
                                </View>

                                <View>
                                    <Text className="text-base font-bold text-beige mb-2">Değişiklikler</Text>
                                    <Text className="text-sm text-beige/70 leading-relaxed">
                                        Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda uygulama içinde bilgilendirileceksiniz.
                                    </Text>
                                </View>

                                <View className="pt-4 border-t border-white/10">
                                    <Text className="text-xs text-beige/50 text-center">
                                        Son güncelleme: 12 Şubat 2026
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
