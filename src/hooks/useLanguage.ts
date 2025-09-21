import { useState, useEffect } from 'react';

export function useLanguage() {
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    // Default to browser language or 'en' if not available
    const browserLang = navigator.language.split('-')[0];
    setLanguage(browserLang || 'en');

    // You can add more sophisticated language detection logic here
    // For example, checking localStorage, URL params, or user preferences
  }, []);

  return { language };
}
