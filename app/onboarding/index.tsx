import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StatusBar, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"; // Import hook
import { ArrowRight, ShieldCheck, Moon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next"; // Added

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Get insets
  const { t, i18n } = useTranslation(); // Added
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const scrollToPage = (page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  };

  return (
    <SafeAreaView className="flex-1 bg-emerald-deep">
      <StatusBar barStyle="light-content" />
      
      {/* Language Selector */}
      <View className="w-full z-50 flex-row justify-center gap-6 mt-4 mb-2">
        {['tr', 'en', 'ar'].map((lang) => (
          <TouchableOpacity 
            key={lang} 
            onPress={() => i18n.changeLanguage(lang)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="px-2 py-1"
          >
            <Text className={`text-sm font-bold tracking-widest ${i18n.language === lang ? 'text-primary' : 'text-emerald-200/40'}`}>
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Branding */}
      <View className="items-center pt-6 pb-2">
        <Text className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Farz App</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {/* Page 1 */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8">
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-full aspect-square max-w-[280px] relative mb-8 flex items-center justify-center">
              <View className="absolute inset-0 bg-primary/10 rounded-full scale-95 blur-xl" />
              <View className="relative z-10 flex flex-col items-center">
                <View className="w-56 h-56 rounded-full overflow-hidden items-center justify-center shadow-2xl shadow-primary/30 bg-emerald-light">
                   {/* Placeholder Graphic with Colors */}
                   <Moon size={100} color="#D2691E" />
                </View>
              </View>
            </View>

            <View className="items-center space-y-4 px-4">
              <Text className="text-primary text-[28px] font-bold leading-snug text-center">
                {t('onboarding.welcome_title')}
              </Text>
              <Text className="text-emerald-100/80 text-base font-medium leading-loose text-center max-w-[300px] mx-auto">
                {t('onboarding.welcome_desc')}
              </Text>
            </View>
          </View>
        </View>

        {/* Page 2 */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8">
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-full flex items-center justify-center mb-8">
              <View className="relative w-64 h-64 bg-emerald-light rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-emerald-800">
                <LinearGradient
                  colors={['rgba(210, 105, 30, 0.05)', 'transparent']}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View className="w-full px-8 flex flex-col gap-4">
                  <View className="flex-row items-center gap-4 p-3 bg-emerald-deep rounded-lg">
                    <View className="h-6 w-6 rounded border-2 border-primary bg-primary" />
                    <View className="h-2 w-24 bg-emerald-800 rounded-full" />
                  </View>
                  <View className="flex-row items-center gap-4 p-3 bg-emerald-900 rounded-lg border border-emerald-800">
                    <View className="h-6 w-6 rounded border-2 border-primary/40" />
                    <View className="h-2 w-32 bg-emerald-800/50 rounded-full" />
                  </View>
                </View>
              </View>
            </View>

            <View className="items-center space-y-3 px-4">
              <Text className="text-primary text-[28px] font-bold tracking-tight leading-tight text-center">
                {t('onboarding.track_title')}
              </Text>
              <Text className="text-emerald-100/60 text-sm font-normal leading-relaxed text-center max-w-[280px]">
                {t('onboarding.track_desc')}
              </Text>
            </View>
          </View>
        </View>

        {/* Page 3 */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8">
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-full flex items-center justify-center mb-8">
               <View className="w-64 h-64 bg-emerald-light rounded-2xl items-center justify-center border border-emerald-800 relative shadow-2xl shadow-primary/10">
                  <View className="absolute top-4 right-4 animate-bounce">
                     <View className="w-8 h-8 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/50">
                        <Text className="text-white font-bold text-xs">1</Text>
                     </View>
                  </View>
                  <Text className="text-6xl font-black text-emerald-800/50 tracking-tighter">
                     365
                  </Text>
                  <Text className="text-sm font-medium text-primary mt-2 uppercase tracking-widest">{t('onboarding.days_left')}</Text>
               </View>
            </View>

            <View className="items-center space-y-3 px-4">
              <Text className="text-primary text-[28px] font-bold tracking-tight leading-tight text-center">
                {t('onboarding.goal_title')}
              </Text>
              <Text className="text-emerald-100/60 text-sm font-normal leading-relaxed text-center max-w-[280px]">
                {t('onboarding.goal_desc')}
              </Text>
            </View>
          </View>
        </View>
        
      </ScrollView>

      {/* Bottom Controls */}
      <View 
        className="absolute bottom-0 left-0 right-0 p-8 bg-emerald-deep"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 10 }}
      >
        <View className="items-center mb-8 flex-row justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <View 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentPage ? 'w-8 bg-primary' : 'w-1.5 bg-emerald-800'
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => {
            if (currentPage < 2) {
              scrollToPage(currentPage + 1);
            } else {
              router.push("/onboarding/calculation");
            }
          }}
          activeOpacity={0.9}
          className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center space-x-2 shadow-lg shadow-primary/25"
        >
          <Text className="text-white font-bold text-base tracking-wide uppercase">
            {currentPage === 2 ? t('onboarding.start') : t('onboarding.continue')}
          </Text>
          <ArrowRight color="white" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
