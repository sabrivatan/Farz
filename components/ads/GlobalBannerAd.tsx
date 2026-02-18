import React from 'react';
import { View, Platform, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from '@/lib/admob';

const adUnitId = Platform.select({
  ios: 'ca-app-pub-2937808553151023/6928741828',
  android: 'ca-app-pub-2937808553151023/9329672321', // Real Android Banner ID
}) || TestIds.BANNER;

export const GlobalBannerAd = ({ delay = 0 }: { delay?: number }) => {
  const [adError, setAdError] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!BannerAd || adError || !isVisible) return null;

  const unitId = __DEV__ ? TestIds.BANNER : adUnitId;

  return (
    <View className="items-center justify-center py-2 bg-transparent w-full">
        <BannerAd
            unitId={unitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
            requestNonPersonalizedAdsOnly: true,
            }}
            onAdFailedToLoad={(error: any) => {
                console.log('Ad failed to load: ', error);
                setAdError(true);
            }}
        />
    </View>
  );
};
