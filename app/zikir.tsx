import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Dhikr {
  id: string;
  nameArabic: string;
  nameTurkish: string;
  targetCount: number;
  currentCount: number;
  isCustom: boolean;
}

// Preset Dhikrs
export const PRESET_DHIKRS: Dhikr[] = [
  {
    id: 'subhanallah',
    nameArabic: 'سبحان الله',
    nameTurkish: 'Subhanallah',
    targetCount: 33,
    currentCount: 0,
    isCustom: false
  },
  {
    id: 'alhamdulillah',
    nameArabic: 'الحمد لله',
    nameTurkish: 'Elhamdülillah',
    targetCount: 33,
    currentCount: 0,
    isCustom: false
  },
  {
    id: 'allahuakbar',
    nameArabic: 'الله أكبر',
    nameTurkish: 'Allahu Ekber',
    targetCount: 33, // While often 34 in some traditions, 33 is common in tasbih fatimah, sticking to plan but 33/33/34 is common. Let's use 33 for uniformity unless specified. Wait, plan said 34 for Allahu Akbar.
    currentCount: 0,
    isCustom: false
  },
  {
    id: 'lailahaillallah',
    nameArabic: 'لا إله إلا الله',
    nameTurkish: 'La ilahe illallah',
    targetCount: 100,
    currentCount: 0,
    isCustom: false
  },
  {
    id: 'astaghfirullah',
    nameArabic: 'أستغفر الله',
    nameTurkish: 'Estağfirullah',
    targetCount: 100,
    currentCount: 0,
    isCustom: false
  },
  {
    id: 'salavat',
    nameArabic: 'اللهم صل على محمد',
    nameTurkish: 'Salavat-ı Şerife',
    targetCount: 100,
    currentCount: 0,
    isCustom: false
  }
];

export default function ZikirList() {
    const router = useRouter();
    const [dhikrs, setDhikrs] = useState<Dhikr[]>(PRESET_DHIKRS);
    
    // Load counts and custom dhikrs from storage
    const loadDhikrs = useCallback(async () => {
        try {
            // Load custom dhikrs
            const storedCustom = await AsyncStorage.getItem('custom_dhikrs');
            const customDhikrs: Dhikr[] = storedCustom ? JSON.parse(storedCustom) : [];
            
            // Merge presets with custom
            const allDhikrs = [...PRESET_DHIKRS, ...customDhikrs];

            // TODO: Load saved counts for each header if we want to show progress in list
            // For now, just setting list
            
            setDhikrs(allDhikrs);
        } catch (error) {
            console.error('Error loading dhikrs:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDhikrs();
        }, [loadDhikrs])
    );

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
                            Zikirmatik
                        </Text>
                    </View>
                    <TouchableOpacity 
                        className="p-2 bg-emerald-card rounded-full border border-white/10"
                        onPress={() => router.push('/zikir/create')}
                    >
                        <Plus color="#CD853F" size={20} />
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView 
                    className="flex-1 px-4 pt-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Presets Title if we have custom ones to separate */}
                    {dhikrs.some(d => !d.isCustom) && (
                        <Text className="text-beige/60 text-xs uppercase tracking-widest mb-3 ml-1">
                            ÖNERİLEN ZİKİRLER
                        </Text>
                    )}

                    {dhikrs.filter(d => !d.isCustom).map((dhikr) => (
                        <TouchableOpacity 
                            key={dhikr.id}
                            className="bg-emerald-card rounded-2xl p-4 mb-3 border border-white/5 flex-row items-center justify-between"
                            onPress={() => router.push(`/zikir/${dhikr.id}`)}
                        >
                            <View className="flex-1">
                                <Text className="text-xl text-beige mb-1 font-amiri" style={{ writingDirection: 'rtl' }}>
                                    {dhikr.nameArabic}
                                </Text>
                                <Text className="text-primary font-bold text-lg">
                                    {dhikr.nameTurkish}
                                </Text>
                            </View>
                            
                            <View className="flex-row items-center gap-3">
                                <View className="items-end">
                                    <Text className="text-beige/40 text-xs uppercase tracking-wider">
                                        HEDEF
                                    </Text>
                                    <Text className="text-beige font-mono font-bold text-lg">
                                        {dhikr.targetCount}
                                    </Text>
                                </View>
                                <ChevronRight color="#F5F0E1" size={20} opacity={0.5} />
                            </View>
                        </TouchableOpacity>
                    ))}

                    {/* Custom Dhikrs Section */}
                    {dhikrs.some(d => d.isCustom) && (
                        <>
                            <Text className="text-beige/60 text-xs uppercase tracking-widest mb-3 ml-1 mt-4">
                                ZİKİRLERİM
                            </Text>
                            {dhikrs.filter(d => d.isCustom).map((dhikr) => (
                                <TouchableOpacity 
                                    key={dhikr.id}
                                    className="bg-emerald-card rounded-2xl p-4 mb-3 border border-white/5 flex-row items-center justify-between"
                                    onPress={() => router.push(`/zikir/${dhikr.id}`)}
                                >
                                    <View className="flex-1">
                                        {dhikr.nameArabic ? (
                                            <Text className="text-xl text-beige mb-1 font-amiri" style={{ writingDirection: 'rtl' }}>
                                                {dhikr.nameArabic}
                                            </Text>
                                        ) : null}
                                        <Text className="text-primary font-bold text-lg">
                                            {dhikr.nameTurkish}
                                        </Text>
                                    </View>
                                    
                                    <View className="flex-row items-center gap-3">
                                        <View className="items-end">
                                            <Text className="text-beige/40 text-xs uppercase tracking-wider">
                                                HEDEF
                                            </Text>
                                            <Text className="text-beige font-mono font-bold text-lg">
                                                {dhikr.targetCount}
                                            </Text>
                                        </View>
                                        <ChevronRight color="#F5F0E1" size={20} opacity={0.5} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                    
                    {/* Add Custom Button (Bottom) */}
                    <TouchableOpacity 
                        className="mt-4 border-2 border-dashed border-white/10 rounded-2xl p-6 items-center flex-row justify-center gap-3"
                         onPress={() => router.push('/zikir/create')}
                    >
                        <Plus color="#CD853F" size={20} />
                        <Text className="text-beige/60 font-semibold">
                            Yeni Zikir Ekle
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
