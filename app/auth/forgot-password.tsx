import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomAlert from '@/components/CustomAlert';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function resetPassword() {
    if (!email) {
        showAlert('Hata', 'Lütfen e-posta adresinizi girin.', 'warning');
        return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'farz://auth/reset-callback', // Or whatever your deep link is configured to
    });

    if (error) {
        showAlert('Hata', error.message, 'danger');
    } else {
        showAlert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.', 'success', () => router.back());
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
            <Text className="text-white font-bold text-xl ml-4 tracking-wide">Şifre Sıfırla</Text>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                
                {/* Icon / Info Section */}
                <View className="items-center mb-12">
                     <View className="w-20 h-20 bg-[#ffffff10] rounded-2xl items-center justify-center border border-[#ffffff20] mb-6">
                        <Mail size={32} color="#D2691E" />
                    </View>
                    <Text className="text-2xl font-bold text-white mb-2 text-center">Şifrenizi mi Unuttunuz?</Text>
                    <Text className="text-white/60 text-center px-4">
                        E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.
                    </Text>
                </View>

                {/* Form Section */}
                <View>
                    
                    {/* Email Input */}
                    <View className="mb-6">
                        <Text className="text-[#D2691E] font-bold text-xs mb-3 uppercase tracking-wide">E-posta Adresi</Text>
                        <View className="bg-[#1a5f4e] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <Mail size={18} color="#D2691E" className="mr-3 opacity-60" />
                            <TextInput
                                onChangeText={setEmail}
                                value={email}
                                placeholder="ornek@farz.com"
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                className="flex-1 text-white text-base font-medium h-full"
                            />
                        </View>
                    </View>

                    {/* Reset Button */}
                    <TouchableOpacity 
                        disabled={loading} 
                        onPress={resetPassword}
                        className="bg-[#D2691E] h-14 rounded-xl items-center justify-center mt-4 shadow-lg shadow-black/20"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Bağlantı Gönder</Text>
                        )}
                    </TouchableOpacity>

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
