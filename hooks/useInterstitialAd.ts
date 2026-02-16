import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from '@/lib/admob';

// Use TestIds.INTERSTITIAL for development
const realAdUnitId = 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx';

const adUnitId = (__DEV__ && TestIds) ? TestIds.INTERSTITIAL : realAdUnitId;

let interstitial: any = null;

if (InterstitialAd && InterstitialAd.createForAdRequest) {
  try {
    interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
    });
  } catch (e) {
    console.log('Failed to create interstitial', e);
  }
}

export const useInterstitialAd = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!interstitial) return;

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      interstitial.load(); // Preload next ad
    });
    
    // Start loading
    try {
        interstitial.load();
    } catch(e) { console.log('Ad load error', e); }

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAd = () => {
    if (loaded && interstitial) {
      try {
        interstitial.show();
      } catch(e) { console.log('Ad show error', e); }
    } else {
        console.log('Ad not loaded yet or not supported');
    }
  };

  return { showAd, loaded };
};
