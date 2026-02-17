import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';


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
            <Image
                source={require('@/assets/splash.png')}
                style={styles.background}
                resizeMode="cover"
            />

            {/* Loading Bar */}
            <View className="absolute bottom-20 w-full px-12">
                <View className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <View 
                        className="h-full bg-white rounded-full shadow-lg shadow-white/50"
                        style={{ width: `${progress}%` }}
                    />
                </View>
                {/* Optional Text - Can be removed if image has text */}
                {/* <Text className="text-center text-white/50 text-xs mt-4 font-medium tracking-wider">
                    VERİLER HAZIRLANIYOR
                </Text> */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#064e3b', // Fallback color
    },
    background: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
});
