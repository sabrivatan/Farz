import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SyncService } from '@/services/SyncService';
import { ChevronLeft, User, Mail, Lock, Check, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomAlert from '@/components/CustomAlert';

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  async function signUpWithEmail() {
    if (!fullName || !email || !password || !confirmPassword) {
        showAlert('Hata', 'Lütfen tüm alanları doldurun.', 'warning');
        return;
    }
    if (password !== confirmPassword) {
        showAlert('Hata', 'Şifreler eşleşmiyor.', 'warning');
        return;
    }
    if (!termsAccepted) {
        showAlert('Hata', 'Lütfen kullanım koşullarını kabul edin.', 'warning');
        return;
    }

    setLoading(true);
    
    // Split name and surname roughly
    const nameParts = fullName.trim().split(' ');
    const surname = nameParts.length > 1 ? nameParts.pop() : '';
    const name = nameParts.join(' ');

    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          surname: surname,
          full_name: fullName // Also store full string
        }
      }
    });

    if (error) {
        showAlert('Kayıt Başarısız', error.message, 'danger');
    } else {
        if (!session) {
            showAlert('Kayıt Başarılı', 'Lütfen gelen kutunuzu kontrol edip email adresinizi onaylayın!', 'success');
        } else {
             // 1. Update Profile with Name/Surname manually (since trigger might miss metadata)
             try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ 
                        name: name, 
                        surname: surname,
                        email: email
                    })
                    .eq('id', session.user.id);
                
                if (profileError) console.error('Profile update error:', profileError);
             } catch (e) {
                 console.error('Profile update exception:', e);
             }

             // 2. Backup existing local data
             const success = await SyncService.backupData();
             
             if (success) {
                 showAlert('Kayıt Başarılı', 'Hesabınız oluşturuldu ve verileriniz yedeklendi.', 'success', () => router.replace('/onboarding/calculation'));
             } else {
                 showAlert('Uyarı', 'Hesap oluşturuldu fakat yedekleme sırasında hata oluştu.', 'warning', () => router.replace('/onboarding/calculation'));
             }
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
            <Text className="text-white font-bold text-xl ml-4 tracking-wide">Kayıt Ol</Text>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                
                {/* Header / Mosque Icon */}
                <View className="items-center mb-12">
                     <View className="w-20 h-20 bg-[#ffffff10] rounded-2xl items-center justify-center border border-[#ffffff20] mb-4">
                        {/* Simple Mosque Representation using Lucide icons or just a placeholder logic */}
                        <View className="items-center">
                            <View className="w-8 h-4 bg-[#D2691E] rounded-t-full" />
                            <View className="w-12 h-6 bg-[#D2691E] -mt-1 rounded-t-sm" />
                        </View>
                    </View>
                    <Text className="text-3xl font-bold text-white mb-2">Yeni Hesap Oluştur</Text>
                    <Text className="text-white/60 text-center px-4">İbadetlerinizi düzenli takip etmek için Farz'a katılın.</Text>
                </View>

                {/* Form */}
                <View>
                    
                    {/* Name Input */}
                    <View className="mb-4">
                        <Text className="text-[#A7F3D0] font-bold text-xs mb-3 uppercase tracking-wide opacity-80">Ad Soyad</Text>
                        <View className="bg-[#065f46] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <User size={18} color="#A7F3D0" className="mr-3 opacity-50" />
                            <TextInput
                                onChangeText={setFullName}
                                value={fullName}
                                placeholder="Adınızı ve soyadınızı girin"
                                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                                className="flex-1 text-white text-sm font-medium h-full"
                            />
                        </View>
                    </View>

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-[#A7F3D0] font-bold text-xs mb-2 uppercase tracking-wide opacity-80">E-posta Adresi</Text>
                        <View className="bg-[#065f46] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <Mail size={18} color="#A7F3D0" className="mr-3 opacity-50" />
                            <TextInput
                                onChangeText={setEmail}
                                value={email}
                                placeholder="example@email.com"
                                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                className="flex-1 text-white text-sm font-medium h-full"
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View className="mb-4">
                        <Text className="text-[#A7F3D0] font-bold text-xs mb-2 uppercase tracking-wide opacity-80">Şifre</Text>
                        <View className="bg-[#065f46] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <Lock size={18} color="#A7F3D0" className="mr-3 opacity-50" />
                            <TextInput
                                onChangeText={setPassword}
                                value={password}
                                placeholder="••••••••"
                                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                                secureTextEntry={!showPassword}
                                className="flex-1 text-white text-sm font-medium h-full"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18} color="#A7F3D0" className="opacity-50" /> : <Eye size={18} color="#A7F3D0" className="opacity-50" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                     {/* Confirm Password Input */}
                     <View className="mb-4">
                        <Text className="text-[#A7F3D0] font-bold text-xs mb-2 uppercase tracking-wide opacity-80">Şifre Tekrar</Text>
                        <View className="bg-[#065f46] rounded-xl h-14 flex-row items-center px-4 border border-[#ffffff10]">
                            <View className="w-[18px] mr-3 items-center justify-center">
                                <Check size={18} color={password && confirmPassword && password === confirmPassword ? "#4ade80" : "#A7F3D0"} className={password && confirmPassword && password === confirmPassword ? "" : "opacity-50"} />
                            </View>
                            <TextInput
                                onChangeText={setConfirmPassword}
                                value={confirmPassword}
                                placeholder="••••••••"
                                placeholderTextColor="rgba(167, 243, 208, 0.4)"
                                secureTextEntry={!showConfirmPassword}
                                className="flex-1 text-white text-sm font-medium h-full"
                            />
                             <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff size={18} color="#A7F3D0" className="opacity-50" /> : <Eye size={18} color="#A7F3D0" className="opacity-50" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Terms Checkbox */}
                    <TouchableOpacity 
                        className="flex-row items-center mt-2"
                        onPress={() => setTermsAccepted(!termsAccepted)}
                    >
                        <View className={`w-5 h-5 rounded border border-[#D2691E] mr-3 items-center justify-center ${termsAccepted ? 'bg-[#D2691E]' : 'bg-[#065f46]'}`}>
                            {termsAccepted && <Check size={14} color="white" />}
                        </View>
                        <Text className="text-white/60 text-xs flex-1">
                            <Text className="text-[#D2691E]">Kullanım Koşullarını</Text> ve <Text className="text-[#D2691E]">Gizlilik Politikasını</Text> kabul ediyorum.
                        </Text>
                    </TouchableOpacity>

                    {/* Sign Up Button */}
                    <TouchableOpacity 
                        disabled={loading} 
                        onPress={signUpWithEmail}
                        className="bg-[#D2691E] h-14 rounded-xl items-center justify-center mt-8 shadow-lg shadow-black/20"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Hesap Oluştur</Text>
                        )}
                    </TouchableOpacity>

                </View>

                {/* Footer */}
                <View className="flex-row justify-center mt-8 pb-8">
                    <Text className="text-white/60 text-sm">Zaten hesabın var mı? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-[#D2691E] font-bold text-sm">Giriş Yap</Text>
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
