import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SyncService } from '@/services/SyncService';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomAlert from '@/components/CustomAlert';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'danger' | 'warning',
    onConfirm: () => setAlertVisible(false),
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'danger' | 'warning' = 'info', onConfirm?: () => void) => {
    setAlertConfig({
        title,
        message,
        type,
        onConfirm: () => {
            setAlertVisible(false);
            if (onConfirm) onConfirm();
        }
    });
    setAlertVisible(true);
  };

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
        showAlert('Giriş Başarısız', error.message, 'danger');
        setLoading(false);
    } else {
        const success = await SyncService.restoreData();
        if (success) {
             // Optional success message, or just redirect
             router.back();
        } else {
             showAlert('Uyarı', 'Giriş yapıldı fakat veri senkronizasyonu sırasında hata oluştu.', 'warning', () => router.back());
        }
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#064e3b]">
        
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 border-b border-white/5 bg-[#064e3b] z-10">
            <TouchableOpacity 
                onPress={() => router.back()} 
                className="w-10 h-10 items-center justify-center rounded-full bg-white/5"
            >
                <ChevronLeft size={24} color="#F5F0E1" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-xl ml-4 tracking-wide">Giriş Yap</Text>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                
                {/* Logo / Title Section */}
                <View className="items-center mb-12">
                    <Text className="text-6xl font-black text-[#D2691E] tracking-widest">FARZ</Text>
                    <Text className="text-[#D2691E] text-xs font-bold tracking-[0.2em] mt-1 opacity-80">İBADET TAKİP UYGULAMASI</Text>
                </View>

                {/* Form Section */}
                <View>
                    
                    {/* Email Input */}
                    <View className="mb-6">
                        <Text className="text-[#D2691E] font-bold text-xs mb-3 uppercase tracking-wide">E-posta Adresi</Text>
                        <View className="bg-[#1a5f4e] rounded-xl h-14 justify-center px-4 border border-[#ffffff10]">
                            <TextInput
                                onChangeText={setEmail}
                                value={email}
                                placeholder="ornek@farz.com"
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                className="text-white text-base font-medium h-full"
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-[#D2691E] font-bold text-xs uppercase tracking-wide">Şifre</Text>
                            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                                <Text className="text-white/60 text-xs">Şifremi Unuttum?</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="bg-[#1a5f4e] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                             <TextInput
                                onChangeText={setPassword}
                                value={password}
                                placeholder="••••••••"
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                className="flex-1 text-white text-base font-medium h-full"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                                {showPassword ? <EyeOff size={20} color="#rgba(255,255,255,0.6)" /> : <Eye size={20} color="#rgba(255,255,255,0.6)" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity 
                        disabled={loading} 
                        onPress={signInWithEmail}
                        className="bg-[#D2691E] h-14 rounded-xl items-center justify-center mt-4 shadow-lg shadow-black/20"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Giriş Yap</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer - Moved inside Form */}
                    <View className="flex-row justify-center pt-6">
                        <Text className="text-white/60 text-sm">Henüz hesabın yok mu? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                            <Text className="text-[#D2691E] font-bold text-sm">Kayıt Ol</Text>
                        </TouchableOpacity>
                    </View>

                </View>

            </ScrollView>
        </KeyboardAvoidingView>
        
        <CustomAlert 
            visible={alertVisible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onConfirm={alertConfig.onConfirm}
        />
    </SafeAreaView>
  );
}
