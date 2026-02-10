import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, User, ArrowRight } from "lucide-react-native";

export default function AuthSelection() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#3E342B] items-center justify-between p-6">
      <View className="flex-1 items-center justify-center space-y-8 w-full">
        {/* Icon Container */}
        <View className="w-48 h-48 bg-[#D98E40]/10 rounded-full items-center justify-center mb-8 border border-[#D98E40]/20">
          <ShieldCheck size={80} color="#D98E40" />
        </View>
        
        {/* Title & Desc */}
        <View className="space-y-4 items-center mb-12">
          <Text className="text-3xl font-bold text-[#F5E6D3] text-center">
            İlerlemeni{"\n"}
            <Text className="text-[#D98E40]">Kaybetme</Text>
          </Text>
          
          <Text className="text-[#bcaaa4] text-center text-lg px-4 leading-relaxed">
            Cihazını değiştirsen bile verilerin güvende olsun. Dilersen şimdi, dilersen daha sonra hesap oluşturabilirsin.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full space-y-4">
            {/* Placeholder for future Auth implementation */}
            <TouchableOpacity 
              className="w-full bg-[#4e4239] p-4 rounded-2xl flex-row items-center justify-center space-x-3 border border-[#5C4D41] opacity-60"
              disabled={true}
            >
                <Text className="text-[#F5E6D3]/60 font-semibold text-lg">Giriş Yap / Üye Ol (Yakında)</Text>
            </TouchableOpacity>

            <View className="flex-row items-center space-x-4 my-2">
                <View className="flex-1 h-[1px] bg-[#5C4D41]" />
                <Text className="text-[#bcaaa4]">veya</Text>
                <View className="flex-1 h-[1px] bg-[#5C4D41]" />    
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/onboarding/calculation")}
              className="w-full bg-[#D98E40] p-4 rounded-2xl flex-row items-center justify-center space-x-3 shadow-lg shadow-[#D98E40]/20"
            >
                <User color="#3E342B" size={20} />
                <Text className="text-[#3E342B] font-bold text-lg">Misafir Olarak Devam Et</Text>
                <ArrowRight color="#3E342B" size={20} />
            </TouchableOpacity>
        </View>
      </View>

      <Text className="text-[#bcaaa4]/60 text-xs text-center mt-4">
        Verilerin sadece bu cihazda saklanacaktır.
      </Text>
    </SafeAreaView>
  );
}
