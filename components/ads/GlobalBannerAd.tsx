import React from 'react';
import { View, Platform, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from '@/lib/admob';

const adUnitId = 'ca-app-pub-2937808553151023/9329672321'; // Real Android Banner ID

export const GlobalBannerAd = () => {
  const [adError, setAdError] = React.useState(false);

  if (!BannerAd || adError) return null;

  const unitId = __DEV__ ? TestIds.BANNER : adUnitId;

  return (
    <View className="items-center justify-center py-1 bg-transparent absolute bottom-0 w-full mb-14">
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
