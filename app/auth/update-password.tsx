import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '@/components/CustomAlert';
import { useTranslation } from 'react-i18next';

export default function UpdatePassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const url = useURL();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionSet, setSessionSet] = useState(false);

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

  useEffect(() => {
    // Handle PKCE flow for deep links
    if (url) {
      try {
        // Create an explicit dummy base to parse deep link searchParams reliably
        const parsedUrl = new URL(url.replace(/^farz:\/\//, 'http://dummy.com/'));
        const code = parsedUrl.searchParams.get('code');

        // Check if old implicit flow tokens exist as fallback
        let accessToken = '';
        let refreshToken = '';
        if (url.includes('#')) {
          const hashPart = url.split('#')[1];
          if (hashPart) {
            const paramsStr = hashPart.split('&');
            paramsStr.forEach((param) => {
              const [key, val] = param.split('=');
              if (key === 'access_token') accessToken = val;
              if (key === 'refresh_token') refreshToken = val;
            });
          }
        }

        if (code) {
          // If it's a PKCE code, exchange it for a session
          supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (!error) {
              setSessionSet(true);
            } else {
              showAlert(t('common.error') ?? 'Hata', error.message, 'danger');
            }
          });
        } else if (accessToken && refreshToken) {
          // If it's an access_token (implicit flow fallback)
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ error }) => {
            if (!error) {
              setSessionSet(true);
            } else {
              showAlert(t('common.error') ?? 'Hata', error.message, 'danger');
            }
          });
        }
      } catch (e) {
        console.error("Error parsing deep link URL for auth session", e);
      }
    }
  }, [url]);

  async function handleUpdatePassword() {
    if (!password) {
        showAlert(t('common.error') ?? 'Hata', t('auth.error_fill_all') ?? 'Lütfen şifrenizi girin', 'warning');
        return;
    }

    setLoading(true);
    
    // Update the password using the current session
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
        showAlert(t('common.error') ?? 'Hata', error.message, 'danger');
    } else {
        showAlert(t('common.success') ?? 'Başarılı', t('auth.update_success') ?? 'Şifreniz başarıyla güncellendi!', 'success', () => {
          router.replace('/auth/login');
        });
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
            <Text className="text-white font-bold text-xl ml-4 tracking-wide">{t('auth.update_pass_title') || 'Şifre Güncelle'}</Text>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                
                {/* Icon / Info Section */}
                <View className="items-center mb-12">
                     <View className="w-20 h-20 bg-[#ffffff10] rounded-2xl items-center justify-center border border-[#ffffff20] mb-6">
                        <Lock size={32} color="#D2691E" />
                    </View>
                    <Text className="text-2xl font-bold text-white mb-2 text-center">{t('auth.update_pass_header') || 'Yeni Şifre Belirle'}</Text>
                    <Text className="text-white/60 text-center px-4">
                        {t('auth.update_pass_desc') || 'Lütfen yeni şifrenizi girin.'}
                    </Text>
                </View>

                {/* Form Section */}
                <View>
                    {/* Password Input */}
                    <View className="mb-6">
                        <Text className="text-[#D2691E] font-bold text-xs mb-3 uppercase tracking-wide">{t('auth.password_label') || 'Şifre'}</Text>
                        <View className="bg-[#1a5f4e] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <Lock size={18} color="#D2691E" className="mr-3 opacity-60" />
                            <TextInput
                                onChangeText={setPassword}
                                value={password}
                                placeholder={t('auth.new_password_placeholder') || 'Yeni Şifreniz'}
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                autoCapitalize="none"
                                secureTextEntry
                                className="flex-1 text-white text-base font-medium h-full"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        disabled={loading} 
                        onPress={handleUpdatePassword}
                        className="bg-[#D2691E] h-14 rounded-xl items-center justify-center mt-4 shadow-lg shadow-black/20"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">{t('auth.update_button') || 'Şifreyi Güncelle'}</Text>
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
