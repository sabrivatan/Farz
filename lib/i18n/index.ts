
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Import translation files
import tr from './locales/tr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const RESOURCES = {
  tr: { translation: tr },
  en: { translation: en },
  ar: { translation: ar },
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // 1. Check AsyncStorage
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      // 2. Fallback to Device Language
      const deviceLanguage = getLocales()[0]?.languageCode;
      if (deviceLanguage && ['tr', 'en', 'ar'].includes(deviceLanguage)) {
        return callback(deviceLanguage);
      }

      // 3. Default to Turkish
      return callback('tr');
    } catch (error) {
      console.log('Language detection error:', error);
      return callback('tr');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('user-language', language);
      
      // RTL Handling
      const isRTL = language === 'ar';
      if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
          // Note: App reload might be required for changes to take full effect
      }
      
    } catch (error) {
       console.log('Language caching error:', error); 
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR as any)
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
        useSuspense: false
    }
  });

export default i18n;
