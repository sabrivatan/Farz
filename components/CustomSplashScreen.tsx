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
            {/* Background Gradient - Dark Brown Theme */}
            <LinearGradient
                colors={['#4a3f35', '#3E342B']} 
                style={styles.background}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Blur Elements - Subtle warm glow */}
            <View style={[styles.blurCircle, styles.blurTopRight]} />
            <View style={[styles.blurCircle, styles.blurBottomLeft]} />

            {/* Main Content */}
            <View className="flex-1 items-center justify-center">
                {/* Icon Container with Mustard Glow */}
                <View className="mb-8 items-center justify-center">
                    <View className="w-24 h-24 rounded-3xl bg-[#D98E40]/10 border border-[#D98E40]/30 items-center justify-center shadow-lg shadow-[#D98E40]/20 relative">
                        <Sparkles size={48} color="#D98E40" strokeWidth={1.5} />
                        <View className="absolute inset-0 bg-[#D98E40]/5 rounded-3xl" />
                    </View>
                </View>

                {/* Typography */}
                <View className="items-center space-y-2">
                    <Text className="text-[#D98E40] text-[48px] font-bold tracking-tight leading-none">
                        Farz
                    </Text>
                    <Text className="text-[#F5E6D3]/80 text-lg font-light tracking-[0.2em] uppercase pt-2">
                        İbadet borcu takibi
                    </Text>
                </View>
            </View>

            {/* Bottom Area */}
            <View className="w-full max-w-[280px] px-8 pb-20 items-center space-y-6">
                {/* Progress Bar Section */}
                <View className="w-full space-y-4">
                    <Text className="text-[#F5E6D3]/40 text-xs font-medium tracking-widest uppercase text-center mb-1">
                        Hazırlanıyor
                    </Text>
                    <View className="h-[2px] w-full bg-[#F5E6D3]/10 rounded-full overflow-hidden">
                        <View 
                            style={{ 
                                width: `${progress}%`,
                                height: '100%', 
                                backgroundColor: '#D98E40'
                            }} 
                        />
                    </View>
                </View>

                {/* Version Footer */}
                <Text className="text-[#F5E6D3]/20 text-[10px] font-medium tracking-widest uppercase mt-4">
                    v1.0.4 • 2024
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#3E342B',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    blurCircle: {
        position: 'absolute',
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: 'rgba(217, 142, 64, 0.05)', // Mustard glow
    },
    blurTopRight: {
        top: -96,
        right: -96,
    },
    blurBottomLeft: {
        bottom: -96,
        left: -96,
    }
});
