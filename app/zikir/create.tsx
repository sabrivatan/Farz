import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dhikr } from '../zikir';

export default function CreateZikir() {
    const router = useRouter();
    const [nameTurkish, setNameTurkish] = useState('');
    const [nameArabic, setNameArabic] = useState('');
    const [targetCount, setTargetCount] = useState('33');

    const handleSave = async () => {
        if (!nameTurkish.trim()) {
            Alert.alert('Hata', 'Lütfen zikir adını giriniz.');
            return;
        }

        const target = parseInt(targetCount);
        if (isNaN(target) || target <= 0) {
            Alert.alert('Hata', 'Lütfen geçerli bir hedef sayısı giriniz.');
            return;
        }

        const newDhikr: Dhikr = {
            id: Date.now().toString(),
            nameTurkish: nameTurkish.trim(),
            nameArabic: nameArabic.trim(),
            targetCount: target,
            currentCount: 0,
            isCustom: true
        };

        try {
            // Get existing custom dhikrs
            const stored = await AsyncStorage.getItem('custom_dhikrs');
            const customDhikrs: Dhikr[] = stored ? JSON.parse(stored) : [];
            
            // Add new one
            customDhikrs.push(newDhikr);
            
            // Save back
            await AsyncStorage.setItem('custom_dhikrs', JSON.stringify(customDhikrs));
            
            Alert.alert('Başarılı', 'Yeni zikir oluşturuldu.', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error saving dhikr:', error);
            Alert.alert('Hata', 'Zikir kaydedilemedi.');
        }
    };

    return (
        <View className="flex-1 bg-emerald-deep">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                            <ChevronLeft color="#F5F0E1" size={24} />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-beige tracking-tight">
                            Yeni Zikir Oluştur
                        </Text>
                    </View>
                </View>

                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 px-6 pt-6">
                        {/* Name Input */}
                        <View className="mb-6">
                            <Text className="text-beige/60 text-sm uppercase tracking-widest mb-2">
                                ZİKİR ADI (TÜRKÇE)
                            </Text>
                            <TextInput
                                className="bg-emerald-card text-beige p-4 rounded-xl border border-white/10 text-lg"
                                placeholder="Örn: Ya Rafi"
                                placeholderTextColor="#F5F0E1aa"
                                value={nameTurkish}
                                onChangeText={setNameTurkish}
                            />
                        </View>

                        {/* Arabic Name Input */}
                        <View className="mb-6">
                            <Text className="text-beige/60 text-sm uppercase tracking-widest mb-2">
                                ARAPÇA METİN (OPSİYONEL)
                            </Text>
                            <TextInput
                                className="bg-emerald-card text-beige p-4 rounded-xl border border-white/10 text-lg font-amiri text-right"
                                placeholder="يا رافع"
                                placeholderTextColor="#F5F0E1aa"
                                value={nameArabic}
                                onChangeText={setNameArabic}
                            />
                        </View>

                        {/* Target Count Input */}
                        <View className="mb-8">
                            <Text className="text-beige/60 text-sm uppercase tracking-widest mb-2">
                                HEDEF SAYISI
                            </Text>
                            <TextInput
                                className="bg-emerald-card text-beige p-4 rounded-xl border border-white/10 text-lg"
                                placeholder="33"
                                placeholderTextColor="#F5F0E1aa"
                                keyboardType="number-pad"
                                value={targetCount}
                                onChangeText={setTargetCount}
                            />
                            <View className="flex-row gap-2 mt-2">
                                {[33, 99, 100, 500].map(num => (
                                    <TouchableOpacity 
                                        key={num}
                                        onPress={() => setTargetCount(num.toString())}
                                        className={`px-3 py-1 rounded-full border ${targetCount === num.toString() ? 'bg-primary border-primary' : 'border-white/20'}`}
                                    >
                                        <Text className={`text-xs ${targetCount === num.toString() ? 'text-white' : 'text-beige/60'}`}>
                                            {num}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity 
                            className="bg-primary p-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90"
                            onPress={handleSave}
                        >
                            <Save color="#FFF" size={20} />
                            <Text className="text-white font-bold text-lg">
                                Kaydet
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
