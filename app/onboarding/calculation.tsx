import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Calculator, Calendar, Info, ArrowRight } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { calculateBulughDate, Gender } from "@/lib/calculations";
import { getDb } from "@/db";
import { calculateInitialDebtDays } from "@/lib/calculations";

const COLORS = {
  background: '#3E342B',
  cardBg: '#4e4239',
  border: '#5C4D41',
  textPrimary: '#F5E6D3',
  textSecondary: '#bcaaa4',
  accent: '#D98E40',
  accentDark: '#c68541',
};

export default function CalculationForm() {
  const router = useRouter();
  
  // Form state
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [bulughDate, setBulughDate] = useState<Date | null>(null);
  const [prayerStartDate, setPrayerStartDate] = useState<Date | null>(null);
  const [fastingStartDate, setFastingStartDate] = useState<Date | null>(null);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<'birth' | 'bulugh' | 'prayer' | 'fasting'>('birth');

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
    setCurrentDateField(field);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    try {
        setShowDatePicker(Platform.OS === 'ios');
        
        if (selectedDate && event.type !== 'dismissed') {
          switch (currentDateField) {
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
    } catch (e) {
        console.error("Date change error:", e);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "mm/dd/yyyy";
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleCalculate = async () => {
    if (!gender || !birthDate || !bulughDate || !prayerStartDate || !fastingStartDate) {
      return;
    }

    try {
      const db = getDb();
      const now = new Date();
      
      const prayerDays = calculateInitialDebtDays(prayerStartDate, now);
      const fastingDays = calculateInitialDebtDays(fastingStartDate, now);
      const fastingDebt = Math.floor((fastingDays / 365.25) * 30);

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO profile (name, gender, birth_date, bulugh_date, created_at) VALUES (?, ?, ?, ?, ?)`,
          ['Misafir', gender, birthDate.toISOString(), bulughDate.toISOString(), now.toISOString()]
        );
        
        const prayerTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
        for (const type of prayerTypes) {
          await db.runAsync('UPDATE debt_counts SET count = ? WHERE type = ?', [prayerDays, type]);
        }
        await db.runAsync('UPDATE debt_counts SET count = ? WHERE type = ?', [fastingDebt, 'fasting']);
      });

      router.replace("/(tabs)");
    } catch (e) {
      console.error("Calculation error:", e);
    }
  };

  const isFormValid = gender && birthDate && bulughDate && prayerStartDate && fastingStartDate;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borç Hesapla</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBox}>
              <Calculator size={32} color={COLORS.accent} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Gelişmiş Borç Hesaplama{"\n"}Formu
          </Text>
          <Text style={styles.subtitle}>
            Kaza borçlarınızın hesaplanması için aşağıdaki bilgileri güncelleyiniz.
          </Text>

          {/* Gender Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Cinsiyet</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                onPress={() => handleGenderSelect('male')}
                style={[
                  styles.genderButton,
                  gender === 'male' ? styles.genderButtonActive : styles.genderButtonInactive
                ]}
              >
                <Text style={gender === 'male' ? styles.genderTextActive : styles.genderTextInactive}>
                  Erkek
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleGenderSelect('female')}
                style={[
                  styles.genderButton,
                  gender === 'female' ? styles.genderButtonActive : styles.genderButtonInactive
                ]}
              >
                <Text style={gender === 'female' ? styles.genderTextActive : styles.genderTextInactive}>
                  Kadın
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Birth Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Doğum Tarihi</Text>
            <TouchableOpacity
              onPress={() => showPicker('birth')}
              style={styles.dateInput}
            >
              <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(birthDate)}
              </Text>
              <Calendar size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info Box - Bulugh */}
          {gender && birthDate && (
            <View style={styles.infoBox}>
              <Info size={20} color={COLORS.accent} style={{ marginTop: 2 }} />
              <Text style={styles.infoText}>
                Buluğ tarihi girilmezse; kadınlar için 12, erkekler için 15 yaş esas alınacaktır.
              </Text>
            </View>
          )}

          {/* Bulugh Date (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Buluğ Tarihi <Text style={styles.labelOptional}>(Opsiyonel)</Text>
            </Text>
            <TouchableOpacity
              onPress={() => showPicker('bulugh')}
              style={styles.dateInput}
            >
              <Text style={bulughDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(bulughDate)}
              </Text>
              <Calendar size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Prayer Start Date */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Düzenli namaz kılmaya başlama tarihi
            </Text>
            <TouchableOpacity
              onPress={() => showPicker('prayer')}
              style={styles.dateInput}
            >
              <Text style={prayerStartDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(prayerStartDate)}
              </Text>
              <Calendar size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Fasting Start Date */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Düzenli oruç tutmaya başlama tarihi
            </Text>
            <TouchableOpacity
              onPress={() => showPicker('fasting')}
              style={styles.dateInput}
            >
              <Text style={fastingStartDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(fastingStartDate)}
              </Text>
              <Calendar size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Privacy Info */}
          <View style={styles.privacyBox}>
            <Info size={18} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
            <Text style={styles.privacyText}>
              Verileriniz sadece cihazınızda saklanır ve anonim olarak hesaplama yapılır.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          onPress={handleCalculate}
          disabled={!isFormValid}
          style={[
            styles.calculateButton,
            isFormValid ? styles.calculateButtonActive : styles.calculateButtonInactive
          ]}
        >
          <Text style={isFormValid ? styles.calculateTextActive : styles.calculateTextInactive}>
            Hesapla
          </Text>
          <ArrowRight size={20} color={isFormValid ? COLORS.background : COLORS.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={
            currentDateField === 'birth' ? (birthDate || new Date(2000, 0, 1)) :
            currentDateField === 'bulugh' ? (bulughDate || new Date()) :
            currentDateField === 'prayer' ? (prayerStartDate || new Date()) :
            (fastingStartDate || new Date())
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: `${COLORS.accent}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.accent}33`,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  labelOptional: {
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  genderButtonInactive: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.border,
  },
  genderTextActive: {
    fontWeight: '600',
    color: COLORS.background,
  },
  genderTextInactive: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dateInput: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    color: COLORS.textPrimary,
  },
  datePlaceholder: {
    color: `${COLORS.textSecondary}80`,
  },
  infoBox: {
    backgroundColor: `${COLORS.accent}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}33`,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  privacyBox: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  calculateButton: {
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  calculateButtonActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  calculateButtonInactive: {
    backgroundColor: COLORS.border,
  },
  calculateTextActive: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.background,
  },
  calculateTextInactive: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
