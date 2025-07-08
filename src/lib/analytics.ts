import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare const gtag: any; // Will be available via the script in index.html

const GA_MEASUREMENT_ID = 'G-XGD48X4ZQS';
const isProduction = process.env.NODE_ENV === 'production';

// Initialize GA4
export const initGA = () => {
  if (isProduction && typeof window !== 'undefined') {
    // dataLayer is initialized in index.html
    if (typeof gtag === 'function') {
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll handle page views manually for SPA
      });
    }
  }
};

// Track page views
export const trackPageView = (path: string) => {
  if (isProduction && typeof window !== 'undefined' && typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_path: path,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  if (isProduction && typeof window !== 'undefined' && typeof gtag === 'function') {
    gtag('event', action, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

// Track form submissions
export const trackFormSubmission = (formName: string, data: Record<string, any> = {}) => {
  trackEvent('form_submission', {
    form_name: formName,
    ...data,
  });};

// Track mystery creation
export const trackMysteryCreation = (mysteryType: string, data: Record<string, any> = {}) => {
  trackEvent('mystery_created', {
    mystery_type: mysteryType,
    ...data,
  });
};

// Hook to track page views on route changes
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (isProduction) {
      trackPageView(location.pathname + location.search);
    }
  }, [location]);
};
