export const useInterstitialAd = () => {
  // Interstitial ads are currently disabled by user request.
  // Returning no-op functions to keep existing code working without changes.
  
  const showAd = () => {
    // console.log('Interstitial ad requested but disabled');
  };

  return { showAd, loaded: false };
};
