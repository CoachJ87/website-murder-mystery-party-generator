/**
 * Utilities to help with Static Site Generation
 */

// Check if we're in SSG mode
export const isSSG = () => {
  return typeof window === 'undefined' || window.__SSG__;
};

// Check if we're in browser
export const isBrowser = () => {
  return typeof window !== 'undefined';
};

// Get the current route for SSG
export const getCurrentRoute = () => {
  if (isBrowser()) {
    return window.location.pathname;
  }
  return '/'; // Default for SSG
};

// Helper to add SSG metadata to the document
export const addSsgMetadata = (route: string) => {
  if (!isBrowser()) return;
  
  // Get metadata based on route
  const metadata = getRouteMetadata(route);
  
  // Update document title
  document.title = metadata.title;
  
  // Update meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', metadata.description);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = metadata.description;
    document.head.appendChild(meta);
  }
  
  // Add Open Graph tags
  addOrUpdateMeta('property', 'og:title', metadata.title);
  addOrUpdateMeta('property', 'og:description', metadata.description);
  addOrUpdateMeta('property', 'og:url', `https://murder-mystery.party${route}`);
};

// Helper to add or update meta tags
const addOrUpdateMeta = (attrName: string, attrValue: string, content: string) => {
  if (!isBrowser()) return;
  
  const existingMeta = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (existingMeta) {
    existingMeta.setAttribute('content', content);
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute(attrName, attrValue);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
};

// Get metadata for a specific route
const getRouteMetadata = (route: string) => {
  const defaultMetadata = {
    title: 'Murder Mystery Party Generator',
    description: 'Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events.'
  };
  
  const routeMetadata: Record<string, { title: string, description: string }> = {
    '/': defaultMetadata,
    '/showcase': {
      title: 'Showcase | Murder Mystery Party Generator',
      description: 'Browse our collection of murder mystery scenarios and get inspired for your next event.'
    },
    '/contact': {
      title: 'Contact Us | Murder Mystery Party Generator',
      description: 'Get in touch with our team for support or inquiries about our murder mystery generator.'
    },
    '/privacy': {
      title: 'Privacy Policy | Murder Mystery Party Generator',
      description: 'Learn about how we protect your data and privacy when using our murder mystery generator.'
    },
    '/support': {
      title: 'Support | Murder Mystery Party Generator',
      description: 'Find answers to common questions and get help with our murder mystery generator.'
    }
  };
  
  return routeMetadata[route] || defaultMetadata;
};