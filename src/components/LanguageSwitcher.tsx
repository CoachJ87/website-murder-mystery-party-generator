
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-cn', name: '中文' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'da', name: 'Dansk' },
  { code: 'sv', name: 'Svenska' },
  { code: 'fi', name: 'Suomi' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  // Listen for language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log(`Language changed to: ${lng}`);
      setCurrentLang(lng);
      
      // Debug: Check translations after a short delay
      setTimeout(() => {
        console.log('--- After language change ---');
        console.log('Current language:', i18n.language);
        console.log('t(navigation.home):', i18n.t('navigation.home'));
        console.log('i18n store:', i18n.store.data);
      }, 100);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const handleLanguageChange = async (languageCode: string) => {
    console.log(`\n=== Starting language change to: ${languageCode} ===`);
    
    // Log initial state
    console.log('Before change - current language:', i18n.language);
    console.log('Before change - t(navigation.home):', i18n.t('navigation.home'));
    
    try {
      // Change the language
      await i18n.changeLanguage(languageCode);
      console.log('\n--- After changeLanguage() ---');
      console.log('Current language:', i18n.language);
      console.log('t(navigation.home):', i18n.t('navigation.home'));
      
      // Test after a short delay
      setTimeout(() => {
        console.log('\n--- After 500ms delay ---');
        console.log('Current language:', i18n.language);
        console.log('t(navigation.home):', i18n.t('navigation.home'));
        
        // Test direct resource access
        const resources = i18n.store.data;
        console.log('\n--- Direct Resource Access ---');
        console.log('zh-cn resources:', resources['zh-cn']?.translation);
        
        // Test getResource
        console.log('\n--- i18n.getResource ---');
        console.log('getResource:', i18n.getResource('zh-cn', 'translation', 'navigation.home'));
        
        // Force re-render to check if it helps
        setCurrentLang(i18n.language);
      }, 500);
      
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[140px] h-10 border-border bg-background">
        <SelectValue>
          {currentLanguage?.name || 'English'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            {language.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
