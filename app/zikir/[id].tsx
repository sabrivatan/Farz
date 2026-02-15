import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Vibration, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, RotateCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { PRESET_DHIKRS, Dhikr } from '../zikir';
import { useTranslation } from 'react-i18next'; // Added

const { width } = Dimensions.get('window');
const COUNTER_SIZE = width * 0.7;

export default function ZikirCounter() {
    const router = useRouter();
    const { t } = useTranslation(); // Added
    const { id } = useLocalSearchParams();
    const [dhikr, setDhikr] = useState<Dhikr | null>(null);
    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [showCompletion, setShowCompletion] = useState(false);
    
    // Animation
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const completionScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadDhikr();
    }, [id]);

    useEffect(() => {
        if (target > 0) {
            Animated.timing(progressAnim, {
                toValue: count / target,
                duration: 300,
                useNativeDriver: false // width doesn't support native driver
            }).start();
        }
    }, [count, target]);

    // Handle completion animation
    useEffect(() => {
        if (showCompletion) {
            Animated.spring(completionScaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            completionScaleAnim.setValue(0);
        }
    }, [showCompletion]);

    const loadDhikr = async () => {
        try {
            // Check if it's a preset
            let foundDhikr = PRESET_DHIKRS.find(d => d.id === id);
            
            // If not found in presets, check custom dhikrs
            if (!foundDhikr) {
                const storedCustom = await AsyncStorage.getItem('custom_dhikrs');
                if (storedCustom) {
                    const customDhikrs: Dhikr[] = JSON.parse(storedCustom);
                    foundDhikr = customDhikrs.find(d => d.id === id);
                }
            }
            
            if (foundDhikr) {
                setDhikr(foundDhikr);
                setTarget(foundDhikr.targetCount);
                
                // Load saved count
                const saved = await AsyncStorage.getItem(`dhikr_count_${id}`);
                if (saved) {
                    const savedCount = parseInt(saved);
                    setCount(savedCount);
                    // Check if already completed on load
                    if (savedCount >= foundDhikr.targetCount) {
                        setShowCompletion(true);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading dhikr:', error);
        }
    };

    const handleTap = () => {
        // Prevent increment if already completed
        if (count >= target) {
            return;
        }

        // Haptic feedback for tap
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Vibration.vibrate(10);
        }

        // Animate button
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        // Increment count
        const newCount = count + 1;
        setCount(newCount);
        
        // Save progress
        AsyncStorage.setItem(`dhikr_count_${id}`, newCount.toString());

        // Check if target reached
        if (newCount >= target) {
            // Strong feedback for completion
            if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Vibration.vibrate([0, 100, 50, 100]); // Vibrates pattern
            }
            setShowCompletion(true);
        }
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCount(0);
        setShowCompletion(false);
        AsyncStorage.setItem(`dhikr_count_${id}`, '0');
    };

    if (!dhikr) {
        return (
            <View className="flex-1 bg-emerald-deep items-center justify-center">
                <Text className="text-beige">{t('common.loading')}</Text>
            </View>
        );
    }

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View className="flex-1 bg-emerald-deep relative">
            {/* Completion Overlay */}
            {showCompletion && (
                <View className="absolute inset-0 z-50 bg-black/80 items-center justify-center p-6">
                    <Animated.View 
                        style={{ transform: [{ scale: completionScaleAnim }] }}
                        className="bg-emerald-card w-full p-8 rounded-3xl items-center border border-primary/30 shadow-2xl shadow-primary/20"
                    >
                        <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-6 border border-primary">
                            <Text className="text-4xl">✨</Text>
                        </View>
                        
                        <Text className="text-2xl font-bold text-primary text-center mb-2">
                            {t('zikir.completed_title')}
                        </Text>
                        <Text className="text-beige text-center text-lg mb-8">
                            {t('zikir.completed_msg')}
                        </Text>

                        <View className="w-full gap-3">
                            <TouchableOpacity 
                                onPress={() => router.back()}
                                className="bg-primary w-full py-4 rounded-xl items-center active:opacity-90"
                            >
                                <Text className="text-white font-bold text-lg">{t('zikir.back_to_list')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                onPress={handleReset}
                                className="bg-white/5 w-full py-4 rounded-xl items-center active:bg-white/10 border border-white/10"
                            >
                                <Text className="text-beige/60 font-semibold">{t('zikir.restart')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            )}

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ChevronLeft color="#F5F0E1" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleReset} className="p-2">
                        <RotateCw color="#F5F0E1" size={20} opacity={0.6} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View className="flex-1 px-6 pt-4 pb-12 justify-between">
                    {/* Title Section */}
                    <View className="items-center">
                        <Text className="text-3xl text-beige mb-4 font-amiri text-center leading-relaxed">
                            {dhikr.nameArabic}
                        </Text>
                        <Text className="text-primary font-bold text-xl text-center mb-1">
                            {dhikr.isCustom ? dhikr.nameTurkish : t(`zikir.${dhikr.id}`)}
                        </Text>
                        <Text className="text-beige/40 text-sm tracking-widest uppercase">
                            {t('zikir.target')}: {target}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-8">
                        <Animated.View 
                            className="h-full bg-primary"
                            style={{ width: progressWidth }}
                        />
                    </View>

                    {/* Counter Button */}
                    <View className="items-center justify-center flex-1">
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleTap}
                        >
                            <Animated.View 
                                style={{ 
                                    width: COUNTER_SIZE, 
                                    height: COUNTER_SIZE,
                                    transform: [{ scale: scaleAnim }]
                                }}
                                className="rounded-full bg-emerald-card border-4 border-primary/30 items-center justify-center shadow-lg shadow-black/30"
                            >
                                <View className="absolute inset-0 rounded-full border border-white/5" />
                                <View className="absolute inset-2 rounded-full border border-white/5" />
                                
                                <Text className="text-beige font-mono font-bold text-6xl tracking-tighter">
                                    {count}
                                </Text>
                                <Text className="text-beige/30 text-xs mt-2 uppercase tracking-widest">
                                    {t('zikir.tap')}
                                </Text>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    {/* Footer / Instructions */}
                    <Text className="text-beige/30 text-center text-xs mt-8">
                        {t('zikir.reset_instruction')}
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
}
