import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StatusBar, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingFlow() {
  const router = useRouter();
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
    <SafeAreaView className="flex-1 bg-[#3E342B]">
      <StatusBar barStyle="light-content" />
      
      {/* Branding */}
      <View className="items-center pt-6 pb-2">
        <Text className="text-xs font-bold tracking-[0.2em] text-[#D98E40] uppercase">Farz App</Text>
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
              <View className="absolute inset-0 bg-[#D98E40]/10 rounded-full scale-95 blur-xl" />
              <View className="relative z-10 flex flex-col items-center">
                <View className="w-56 h-56 rounded-full overflow-hidden items-center justify-center shadow-2xl shadow-[#D98E40]/30 bg-[#D0B090]">
                  <Image 
                    source={require("@/assets/step1.png")}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            <View className="items-center space-y-3 px-4">
              <Text className="text-[#F5E6D3] text-[28px] font-bold leading-tight tracking-tight text-center">
                Kaza namaz ve oruç borçlarını takip et
              </Text>
              <Text className="text-[#F5E6D3]/60 text-sm font-normal leading-relaxed text-center max-w-[280px] mx-auto">
                Manevi borçlarınızı zamanla azaltmanıza yardımcı olan kolay takip sistemi.
              </Text>
            </View>
          </View>
        </View>

        {/* Page 2 */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8">
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-full flex items-center justify-center mb-8">
              <View className="relative w-64 h-64 bg-[#4e4239] rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-[#5C4D41]">
                <LinearGradient
                  colors={['rgba(217, 142, 64, 0.05)', 'transparent']}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View className="w-full px-8 flex flex-col gap-4">
                  <View className="flex-row items-center gap-4 p-3 bg-[#3E342B] rounded-lg">
                    <View className="h-6 w-6 rounded border-2 border-[#D98E40] bg-[#D98E40]" />
                    <View className="h-2 w-24 bg-[#5C4D41] rounded-full" />
                  </View>
                  <View className="flex-row items-center gap-4 p-3 bg-[#4e4239] rounded-lg border border-[#5C4D41]">
                    <View className="h-6 w-6 rounded border-2 border-[#D98E40]/40" />
                    <View className="h-2 w-32 bg-[#5C4D41]/50 rounded-full" />
                  </View>
                </View>
              </View>
            </View>

            <View className="items-center space-y-3 px-4">
              <Text className="text-[#F5E6D3] text-[28px] font-bold tracking-tight leading-tight text-center">
                Her gün işaretle,{"\n"}borcunu azalt
              </Text>
              <Text className="text-[#F5E6D3]/60 text-sm font-normal leading-relaxed text-center max-w-[280px]">
                Günlük kıldığınız kaza namazlarını ve tuttuğunuz oruçları işaretleyerek borç yükünüzü adım adım hafifletin.
              </Text>
            </View>
          </View>
        </View>

        {/* Page 3 */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8">
          <View className="flex-1 items-center justify-center pb-32">
            <View className="w-full mb-8 aspect-square max-w-[280px] items-center justify-center relative">
              <View className="absolute inset-0 bg-[#D98E40]/10 rounded-full scale-90 blur-3xl" />
              <View className="relative z-10 w-full h-full rounded-3xl overflow-hidden border border-[#D98E40]/10 items-center justify-center">
                <LinearGradient
                  colors={['rgba(217, 142, 64, 0.2)', 'rgba(217, 142, 64, 0.05)']}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View className="bg-[#4e4239] p-8 rounded-2xl shadow-xl flex-col items-center gap-4 border border-[#5C4D41]">
                  <ShieldCheck size={80} color="#D98E40" fill="#D98E40" fillOpacity={0.2} />
                  <View className="flex-row gap-2">
                    <View className="h-2 w-12 bg-[#D98E40] rounded-full" />
                    <View className="h-2 w-8 bg-[#D98E40]/30 rounded-full" />
                  </View>
                </View>
              </View>
            </View>

            <View className="items-center space-y-3 px-4">
              <Text className="text-[#F5E6D3] tracking-tight text-[28px] font-bold leading-tight text-center">
                İlerlemeni kaybetme
              </Text>
              <Text className="text-[#F5E6D3]/60 text-sm font-normal leading-relaxed text-center max-w-[280px]">
                Dilersen daha sonra hesap oluşturabilirsin, verilerini güvenle saklarız.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Controls - Fixed at bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#3E342B] pb-8 pt-4 px-8">
        {/* Progress Dots */}
        <View className="flex-row items-center justify-center gap-2 mb-6">
          <View className={`h-1.5 rounded-full ${currentPage === 0 ? 'w-6 bg-[#D98E40]' : 'w-1.5 bg-[#5C4D41]'}`} />
          <View className={`h-1.5 rounded-full ${currentPage === 1 ? 'w-6 bg-[#D98E40]' : 'w-1.5 bg-[#5C4D41]'}`} />
          <View className={`h-1.5 rounded-full ${currentPage === 2 ? 'w-6 bg-[#D98E40]' : 'w-1.5 bg-[#5C4D41]'}`} />
        </View>

        {/* Buttons */}
        {currentPage < 2 ? (
          <TouchableOpacity 
            onPress={() => scrollToPage(currentPage + 1)}
            className="w-full h-14 bg-[#D98E40] active:bg-[#D98E40]/90 rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-[#D98E40]/20"
          >
            <Text className="text-[#3E342B] font-bold text-base">Devam Et</Text>
            <ArrowRight color="#3E342B" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View className="flex-col gap-3 w-full">
            <TouchableOpacity 
              onPress={() => router.push("/onboarding/calculation")}
              className="w-full bg-[#D98E40] active:bg-[#c68541] py-4 rounded-xl items-center shadow-lg shadow-[#D98E40]/20"
            >
              <Text className="text-[#3E342B] font-bold text-base">Borç Hesapla</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => router.push("/onboarding/auth")}
              className="w-full py-3 items-center"
            >
              <Text className="text-[#F5E6D3]/60 font-medium text-sm">Giriş yap veya Kaydol</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
