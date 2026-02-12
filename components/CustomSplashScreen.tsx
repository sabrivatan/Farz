import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomSplashScreen() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simple interval-based progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 4; // 25 steps to reach 100 in 2.5s
            });
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            {/* Background Gradient - Emerald Theme */}
            <LinearGradient
                colors={['#064e3b', '#065f46']} 
                style={styles.background}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Blur Elements - Subtle cool glow */}
            <View style={[styles.blurCircle, styles.blurTopRight]} />
            <View style={[styles.blurCircle, styles.blurBottomLeft]} />

            {/* Main Content */}
            <View className="flex-1 items-center justify-center">
                {/* Icon Container with Terracotta Glow */}
                <View className="mb-8 items-center justify-center">
                    <View className="w-24 h-24 rounded-3xl bg-[#D2691E]/10 border border-[#D2691E]/30 items-center justify-center shadow-lg shadow-[#D2691E]/20 relative">
                        <Sparkles size={48} color="#D2691E" strokeWidth={1.5} />
                        <View className="absolute inset-0 bg-[#D2691E]/5 rounded-3xl" />
                    </View>
                </View>

                {/* Typography */}
                <View className="items-center space-y-2">
                    <Text className="text-[#D2691E] text-[48px] font-bold tracking-tight leading-none">
                        Farz
                    </Text>
                    <Text className="text-[#e2e8f0]/80 text-lg font-light tracking-[0.2em] uppercase pt-2">
                        İbadet Takip
                    </Text>
                </View>
            </View>

            {/* Loading Bar */}
            <View className="absolute bottom-20 w-full px-12">
                <View className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <View 
                        className="h-full bg-[#D2691E] rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </View>
                <Text className="text-center text-white/30 text-xs mt-4 font-medium tracking-wider">
                    VERİLER HAZIRLANIYOR
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#064e3b',
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    blurCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.15, // Slightly increased due to darker bg
    },
    blurTopRight: {
        top: -100,
        right: -100,
        backgroundColor: '#10b981', // Emerald-500 equivalent
    },
    blurBottomLeft: {
        bottom: -50,
        left: -50,
        backgroundColor: '#D2691E',
    }
});
