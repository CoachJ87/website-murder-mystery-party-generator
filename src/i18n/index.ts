import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zhCn from './locales/zh-cn.json';
import nl from './locales/nl.json';
import da from './locales/da.json';
import sv from './locales/sv.json';
import fi from './locales/fi.json';
import it from './locales/it.json';
import pt from './locales/pt.json';

// Define resource type for better type safety
type Resources = {
  [language: string]: {
    translation: Record<string, any>;
  };
};

// Resources object containing all translations
const resources: Resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ko: { translation: ko },
  ja: { translation: ja },
  'zh-CN': { translation: zhCn },
  'zh-cn': { translation: zhCn }, // Duplicate entry for case sensitivity
  'zh': { translation: zhCn },     // Generic Chinese fallback
  nl: { translation: nl },
  da: { translation: da },
  sv: { translation: sv },
  fi: { translation: fi },
  it: { translation: it },
  pt: { translation: pt },
};



// Extend i18next types
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    resources: typeof resources['en'];
  }
}

// Initialize i18n
const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Default language
    lng: 'en',
    
    // Configure fallback language
    fallbackLng: {
      // Default fallback
      default: ['en'],
      // Chinese variants all point to zh-CN then en
      'zh-CN': ['zh-CN', 'en'],
      'zh-cn': ['zh-CN', 'en'],
      'zh': ['zh-CN', 'en']
    },
    
    // Configure language detection
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng: string) => {
        // Normalize all Chinese variants to zh-CN
        if (lng.toLowerCase().startsWith('zh')) {
          return 'zh-CN';
        }
        return lng;
      }
    } as const,
    
    // Supported languages - include all variants for Chinese
    supportedLngs: [
      'en', 'es', 'fr', 'de', 'ko', 'ja', 
      'zh-CN',      // Browser's Chinese (China) variant
      'zh-cn',      // Our resource key variant
      'nl', 'da', 'sv', 'fi', 'it', 'pt'
    ],
    

    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Debug mode (disabled in production)
    debug: false,
    
    // Enable nested key access with dot notation
    keySeparator: '.',
    // Use double colon for namespaces to avoid conflicts with keys
    nsSeparator: '::',
    
    // Default namespace
    defaultNS: 'translation',
    
    // React options
    react: {
      useSuspense: false, // Disable Suspense as it might interfere with updates
      bindI18n: 'languageChanged',
      bindI18nStore: '',
    },
    // Ensure we get the initialized event
    initImmediate: false,
  });

// Error handler for i18n initialization
i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`Failed to load ${lng} translation for ${ns}:`, msg);
});

export default i18n;
