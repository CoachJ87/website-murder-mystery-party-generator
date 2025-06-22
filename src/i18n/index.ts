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

// Debug: Verify Chinese content is loaded immediately
console.log('=== IMMEDIATE DEBUG ===');
console.log('zhCn content:', zhCn);
console.log('zhCn navigation.home:', zhCn.navigation?.home);
console.log('zhCn keys:', Object.keys(zhCn));

// Store the init promise to ensure we can chain operations
// Initialize i18n with proper typing
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}

const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Default language
    lng: 'en',
    
    // Configure fallback language to be more specific
    fallbackLng: {
      // Default fallback
      default: ['en'],
      // Chinese variants fallback chain
      'zh-CN': ['zh-cn', 'zh', 'en'],
      'zh-cn': ['zh-CN', 'zh', 'en'],
      'zh': ['zh-cn', 'zh-CN', 'en']
    },
    
    // Supported languages - include all variants for Chinese
    supportedLngs: [
      'en', 'es', 'fr', 'de', 'ko', 'ja', 
      'zh',         // Generic Chinese fallback
      'zh-CN',      // Browser's Chinese (China) variant
      'zh-cn',      // Our resource key variant
      'nl', 'da', 'sv', 'fi', 'it', 'pt'
    ],
    
    // Disable language detection from browser
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng) => {
        // Normalize to zh-cn for any Chinese variant
        if (lng.toLowerCase().startsWith('zh')) {
          return 'zh-cn';
        }
        return lng;
      },
    },
    

    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Debug mode (disable in production)
    debug: true,
    
    // Enable nested key access with dot notation
    keySeparator: '.',
    // Use double colon for namespaces to avoid conflicts with keys
    nsSeparator: '::',
    
    // Default namespace
    defaultNS: 'translation',
    
    // React options
    react: {
      useSuspense: true, // Enable suspense for better loading states
      bindI18n: 'languageChanged',
      bindI18nStore: '',
    },
    // Ensure we get the initialized event
    initImmediate: false,
  });

// Debug function to check i18n state
const debugI18n = () => {
  // Test different key formats
  const testTranslations = (prefix = '') => {
    const keys = [
      `${prefix}navigation.home`,
      `${prefix}navigation:home`,
      'navigation.home',
      'navigation:home',
      'navigation',
    ];
    
    console.log('\n--- Testing Key Formats ---');
    keys.forEach(key => {
      try {
        console.log(`t('${key}'):`, i18n.t(key));
        console.log(`  - exists:`, i18n.exists(key));
      } catch (e) {
        console.error(`Error with key '${key}':`, e);
      }
    });
  };
  console.log('\n=== i18n DEBUG ===');
  
  // 1. Check current state
  console.log('Current language:', i18n.language);
  console.log('Languages:', i18n.languages);
  
  // 2. Check resource bundles
  console.log('\n--- Resource Bundles ---');
  const zhBundle = i18n.getResourceBundle('zh-cn', 'translation');
  const enBundle = i18n.getResourceBundle('en', 'translation');
  
  console.log('zh-cn bundle exists:', !!zhBundle);
  console.log('en bundle exists:', !!enBundle);
  
  // 3. Check store structure
  console.log('\n--- Store Structure ---');
  const store = i18n.store.data;
  console.log('Store languages:', Object.keys(store));
  
  // 4. Compare resource structures
  console.log('\n--- Resource Structure ---');
  console.log('en resources:', store['en']?.translation);
  console.log('zh-cn resources:', store['zh-cn']?.translation);
  
  // 5. Test different translation methods
  console.log('\n--- Translation Tests ---');
  
  // Test nested key access
  console.log('\n--- Nested Key Access Test ---');
  const testNestedAccess = (key: string) => {
    try {
      const result = i18n.t(key);
      console.log(`t('${key}'):`, result);
      if (result === key) {
        console.log('  ⚠️ Key not found - using key as fallback');
      }
      return result;
    } catch (e) {
      console.error(`Error with key '${key}':`, e);
      return null;
    }
  };

  // Test with different nesting levels
  testNestedAccess('navigation.home');
  testNestedAccess('navigation');
  testNestedAccess('home');
  
  // Test with different options
  const testKey = 'navigation.home';
  const tests = [
    { desc: 'Default', fn: () => i18n.t(testKey) },
    { desc: 'Explicit lng', fn: () => i18n.t(testKey, { lng: 'zh-cn' }) },
    { desc: 'With ns', fn: () => i18n.t(testKey, { lng: 'zh-cn', ns: 'translation' }) },
    { desc: 'Direct access', fn: () => store['zh-cn']?.translation?.['navigation.home'] },
    { desc: 'Nested access', fn: () => store['zh-cn']?.translation?.navigation?.home },
    { desc: 'Flat key', fn: () => i18n.t('navigation_home') },
    { desc: 'With ns prefix', fn: () => i18n.t('translation:navigation.home') }
  ];
  
  tests.forEach(({ desc, fn }) => {
    try {
      const result = fn();
      console.log(`[${desc}]`, result);
      if (result === 'navigation.home') {
        console.log('  ⚠️ Key not found - using key as fallback');
      }
    } catch (e) {
      console.error(`[${desc}] Error:`, e);
    }
  });
  
  // Test direct access to the resource
  console.log('\n--- Direct Resource Access ---');
  const translation = i18n.getDataByLanguage('zh-cn')?.translation;
  console.log('Translation object:', translation);
  console.log('Nested access (translation.navigation.home):', translation?.navigation?.home);
  console.log('Dynamic access (translation["navigation.home"]):', translation?.['navigation.home']);
  
  // Test with getResource
  console.log('\n--- i18n.getResource Test ---');
  const resource = i18n.getResource('zh-cn', 'translation', 'navigation.home');
  console.log('getResource:', resource);
  
  // 6. Check what keys are available
  console.log('\n--- Available Keys ---');
  console.log('en keys:', Object.keys(enBundle || {}));
  console.log('zh-cn keys:', Object.keys(zhBundle || {}));
  
  // 7. Check if key exists
  console.log('\n--- Key Existence ---');
  console.log(`Exists 'navigation.home' in zh-cn:`, i18n.exists('navigation.home', { lng: 'zh-cn' }));
  console.log(`Exists 'navigation' in zh-cn:`, i18n.exists('navigation', { lng: 'zh-cn' }));
};

// Run debug immediately and after init
setTimeout(debugI18n, 0); // Runs after current stack clears
i18n.on('initialized', debugI18n);

// Also expose for manual testing in console
// @ts-ignore - Adding to window for debugging
window.debugI18n = debugI18n;

export default i18n;
