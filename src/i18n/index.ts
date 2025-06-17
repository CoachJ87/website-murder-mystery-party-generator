
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

// Resources object containing all translations
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ko: { translation: ko },
  ja: { translation: ja },
  'zh-cn': { translation: zhCn },
  nl: { translation: nl },
  da: { translation: da },
  sv: { translation: sv },
  fi: { translation: fi },
  it: { translation: it },
  pt: { translation: pt },
};

// Configure i18next
i18n
  .use(LanguageDetector) // Detect language from browser/localStorage
  .use(initReactI18next) // Bind react-i18next to the instance
  .init({
    resources,
    
    // Default and fallback language
    lng: 'en',
    fallbackLng: 'en',
    
    // Supported languages
    supportedLngs: ['en', 'es', 'fr', 'de', 'ko', 'ja', 'zh-cn', 'nl', 'da', 'sv', 'fi', 'it', 'pt'],
    
    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache the language in localStorage
      caches: ['localStorage'],
      
      // LocalStorage key name
      lookupLocalStorage: 'i18nextLng',
      
      // Don't lookup from path, query, hash, etc.
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Debug mode (disable in production)
    debug: false,
    
    // Key separator (nested keys like "hero.title")
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Default namespace
    defaultNS: 'translation',
    
    // React options
    react: {
      useSuspense: false, // Disable suspense mode
    },
  });

export default i18n;
