
let mobileAds: any = {
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds: { BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial' },
  InterstitialAd: {
    createForAdRequest: () => ({
      addAdEventListener: () => () => {},
      load: () => {},
      show: () => {},
    })
  },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed' },
  default: () => ({ initialize: () => Promise.resolve([]) })
};

try {
  // Use a variable to prevent Metro from trying to resolve this at build time if possible,
  // though Metro usually resolves all requires.
  // The real fix for "Invariant Violation" in Expo Go is often that the module is linked
  // in the bundle but missing on device.
  // However, simple try-catch should work if not hoisted.
  const libName = 'react-native-google-mobile-ads'; 
  mobileAds = require(libName);
} catch (e) {
  console.log('AdMob native module not found, using stub.');
}

export const BannerAd = mobileAds.BannerAd;
export const BannerAdSize = mobileAds.BannerAdSize;
export const TestIds = mobileAds.TestIds;
export const InterstitialAd = mobileAds.InterstitialAd;
export const AdEventType = mobileAds.AdEventType;
export default mobileAds.default;
