import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Calculator, Calendar, Info, ArrowRight } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { calculateBulughDate, Gender } from "@/lib/calculations";
import { getDb } from "@/db";
import { useTranslation } from "react-i18next"; // Added

import { useInterstitialAd } from '@/hooks/useInterstitialAd';

export default function CalculationScreen() {
  const router = useRouter();
  const { showAd, loaded } = useInterstitialAd();
  const { t, i18n } = useTranslation(); // Added
  
  // Form state
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [bulughDate, setBulughDate] = useState<Date | null>(null);
  const [prayerStartDate, setPrayerStartDate] = useState<Date | null>(null);
  const [fastingStartDate, setFastingStartDate] = useState<Date | null>(null);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPickerField, setCurrentPickerField] = useState<'birth' | 'bulugh' | 'prayer' | 'fasting'>('birth');

  const handleGenderSelect = (selectedGender: Gender) => {
    setGender(selectedGender);
    if (birthDate) {
      const calculated = calculateBulughDate(birthDate, selectedGender);
      setBulughDate(calculated);
      if (!prayerStartDate) setPrayerStartDate(calculated);
      if (!fastingStartDate) setFastingStartDate(calculated);
    }
  };

  const showPicker = (field: 'birth' | 'bulugh' | 'prayer' | 'fasting') => {
    setCurrentPickerField(field);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;

    if (selectedDate) {
      switch (currentPickerField) {
        case 'birth':
          setBirthDate(selectedDate);
          if (gender) {
            const calculated = calculateBulughDate(selectedDate, gender);
            setBulughDate(calculated);
            if (!prayerStartDate) setPrayerStartDate(calculated);
            if (!fastingStartDate) setFastingStartDate(calculated);
          }
          break;
        case 'bulugh':
          setBulughDate(selectedDate);
          if (!prayerStartDate) setPrayerStartDate(selectedDate);
          if (!fastingStartDate) setFastingStartDate(selectedDate);
          break;
        case 'prayer':
          setPrayerStartDate(selectedDate);
          break;
        case 'fasting':
          setFastingStartDate(selectedDate);
          break;
      }
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('onboarding.select_date');
    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCalculate = async () => {
    if (!gender || !birthDate || !bulughDate || !prayerStartDate || !fastingStartDate) {
      return;
    }

    try {
      if (!gender || !birthDate || !bulughDate || !prayerStartDate || !fastingStartDate) {
        return;
      }

      const db = getDb();
      
      // 1. Calculate Debt Days
      const oneDay = 24 * 60 * 60 * 1000;
      
      // Prayer Debt
      let prayerDebtDays = 0;
      if (prayerStartDate > bulughDate) {
        // Calculate difference in days + 1 to include the start date
        prayerDebtDays = Math.round((prayerStartDate.getTime() - bulughDate.getTime()) / oneDay) + 1;
      }
      if (prayerDebtDays < 0) prayerDebtDays = 0;

      // Fasting Debt (Approximate: 30 days per year difference)
      let fastingDebtDays = 0;
      if (fastingStartDate > bulughDate) {
        const diffTime = Math.abs(fastingStartDate.getTime() - bulughDate.getTime());
        const diffYears = diffTime / (oneDay * 365.25);
        fastingDebtDays = Math.floor(diffYears * 30);
      }

      console.log('Calculated Debt:', { prayerDebtDays, fastingDebtDays });

      // 2. Save Profile
      await db.runAsync(`
        INSERT OR REPLACE INTO profile (id, gender, birth_date, bulugh_date, regular_start_date, fasting_start_date)
        VALUES (1, ?, ?, ?, ?, ?)
      `, [
        gender,
        birthDate.toISOString(),
        bulughDate.toISOString(),
        prayerStartDate.toISOString(),
        fastingStartDate.toISOString()
      ]);

      // 3. Save Debt Counts
      await db.runAsync('DELETE FROM debt_counts');
      
      const prayerTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      
      for (const type of prayerTypes) {
        await db.runAsync(
          'INSERT INTO debt_counts (type, count) VALUES (?, ?)',
          [type, prayerDebtDays]
        );
      }

      // Fasting
      await db.runAsync(
        'INSERT INTO debt_counts (type, count) VALUES (?, ?)',
        ['fasting', fastingDebtDays]
      );

      // Show Interstitial Ad before navigation
      if (showAd && loaded) {
          try {
            showAd();
          } catch (e) { console.log('Ad failed', e); }
      }
      
      // Navigate to main app
      router.replace("/(tabs)");
      
    } catch (e) {
      console.error("Calculation Error:", e);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  };

  const isValid = gender && birthDate && bulughDate && prayerStartDate && fastingStartDate;

  return (
    <SafeAreaView className="flex-1 bg-emerald-deep">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-emerald-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-emerald-900 rounded-full">
          <ChevronLeft color="#D2691E" size={24} />
        </TouchableOpacity>
        <View>
            <Text className="text-white text-xl font-bold">{t('onboarding.calculation_title')}</Text>
            <Text className="text-emerald-200/60 text-xs">{t('onboarding.step_1')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        
        {/* Info Card */}
        <View className="bg-emerald-900/50 p-4 rounded-xl flex-row gap-3 border border-emerald-800 mb-8">
            <Info size={24} color="#D2691E" />
            <Text className="text-emerald-100 flex-1 text-sm leading-5">
                {t('onboarding.info_text')}
            </Text>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
            
            {/* Gender */}
            <View className="mb-6">
                <Text className="text-primary font-bold mb-3 uppercase text-xs tracking-wider">{t('onboarding.gender')}</Text>
                <View className="flex-row gap-4">
                    <TouchableOpacity 
                        onPress={() => handleGenderSelect('male')}
                        className={`flex-1 py-4 rounded-xl border-2 items-center ${gender === 'male' ? 'bg-primary border-primary' : 'bg-emerald-900 border-emerald-800'}`}
                    >
                        <Text className={`font-bold ${gender === 'male' ? 'text-white' : 'text-emerald-200'}`}>{t('onboarding.male')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleGenderSelect('female')}
                        className={`flex-1 py-4 rounded-xl border-2 items-center ${gender === 'female' ? 'bg-primary border-primary' : 'bg-emerald-900 border-emerald-800'}`}
                    >
                        <Text className={`font-bold ${gender === 'female' ? 'text-white' : 'text-emerald-200'}`}>{t('onboarding.female')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Birth Date */}
            <View className="mb-6">
                 <Text className="text-primary font-bold mb-3 uppercase text-xs tracking-wider">{t('onboarding.birth_date')}</Text>
                 <TouchableOpacity 
                    onPress={() => showPicker('birth')}
                    className="bg-emerald-900 border border-emerald-800 p-4 rounded-xl flex-row items-center justify-between"
                 >
                    <Text className={birthDate ? "text-white font-medium" : "text-emerald-500"}>
                        {formatDate(birthDate)}
                    </Text>
                    <Calendar size={20} color="#D2691E" />
                 </TouchableOpacity>
            </View>

            {/* Bulugh Date (Auto Calculated but editable) */}
            <View className="mb-6">
                 <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-primary font-bold uppercase text-xs tracking-wider">{t('onboarding.bulugh_date')}</Text>
                    <View className="bg-emerald-800 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-emerald-200">{t('onboarding.auto_calculated')}</Text>
                    </View>
                 </View>
                 <TouchableOpacity 
                    onPress={() => showPicker('bulugh')}
                    className="bg-emerald-900 border border-emerald-800 p-4 rounded-xl flex-row items-center justify-between opacity-90"
                 >
                    <Text className={bulughDate ? "text-white font-medium" : "text-emerald-500"}>
                        {formatDate(bulughDate)}
                    </Text>
                    <Calculator size={20} color="#D2691E" />
                 </TouchableOpacity>
            </View>

            {/* Namaz + Fasting Start Date */}
             <View className="mb-6">
                 <Text className="text-primary font-bold mb-3 uppercase text-xs tracking-wider">{t('onboarding.prayer_start_date')}</Text>
                 <TouchableOpacity 
                    onPress={() => showPicker('prayer')}
                    className="bg-emerald-900 border border-emerald-800 p-4 rounded-xl flex-row items-center justify-between"
                 >
                    <Text className={prayerStartDate ? "text-white font-medium" : "text-emerald-500"}>
                        {formatDate(prayerStartDate)}
                    </Text>
                    <Calendar size={20} color="#D2691E" />
                 </TouchableOpacity>
                 <Text className="text-emerald-400/60 text-[10px] mt-2 ml-1">
                    {t('onboarding.start_today_hint')}
                 </Text>
            </View>

             <View className="mb-6">
                 <Text className="text-primary font-bold mb-3 uppercase text-xs tracking-wider">{t('onboarding.fasting_start_date')}</Text>
                 <TouchableOpacity 
                    onPress={() => showPicker('fasting')}
                    className="bg-emerald-900 border border-emerald-800 p-4 rounded-xl flex-row items-center justify-between"
                 >
                    <Text className={fastingStartDate ? "text-white font-medium" : "text-emerald-500"}>
                        {formatDate(fastingStartDate)}
                    </Text>
                    <Calendar size={20} color="#D2691E" />
                 </TouchableOpacity>
            </View>

        </View>
        
        <View className="h-40" /> 
      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-emerald-deep border-t border-emerald-800 shadow-xl">
        <TouchableOpacity
            onPress={handleCalculate}
            disabled={!isValid}
            className={`w-full h-14 rounded-2xl flex-row items-center justify-center space-x-2 shadow-lg ${
                isValid ? 'bg-primary shadow-primary/25' : 'bg-emerald-800 opacity-50'
            }`}
        >
             <Text className="text-white font-bold text-lg">{t('onboarding.calculate_and_start')}</Text>
             <ArrowRight color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal/Component */}
      {showDatePicker && (
        <DateTimePicker
            value={
                currentPickerField === 'birth' ? (birthDate || new Date()) :
                currentPickerField === 'bulugh' ? (bulughDate || new Date()) :
                currentPickerField === 'prayer' ? (prayerStartDate || new Date()) :
                (fastingStartDate || new Date())
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
            locale={i18n.language}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
