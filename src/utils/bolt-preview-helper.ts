/**
 * Helper utilities for Bolt preview compatibility
 */

// Check if we're running in Bolt preview environment
export const isBoltPreview = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for Bolt-specific environment indicators
  return (
    window.location.hostname.includes('bolt.new') || 
    window.location.hostname.includes('stackblitz.io') ||
    !!document.querySelector('[data-bolt-preview]')
  );
};

// Add a marker to the document to indicate Bolt preview is ready
export const markBoltPreviewReady = () => {
  if (typeof window === 'undefined') return;
  
  // Create a hidden element to signal that the preview is ready
  const marker = document.createElement('div');
  marker.id = 'bolt-preview-ready';
  marker.style.display = 'none';
  marker.dataset.boltPreviewReady = 'true';
  document.body.appendChild(marker);
  
  // Also set a global flag
  (window as any).__BOLT_PREVIEW_READY__ = true;
  
  console.log('Bolt preview marked as ready');
};

// Initialize Bolt preview compatibility
export const initBoltPreview = () => {
  if (!isBoltPreview()) return;
  
  console.log('Initializing Bolt preview compatibility');
  
  // Add special styles for Bolt preview
  const style = document.createElement('style');
  style.textContent = `
    /* Bolt preview compatibility styles */
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      display: block;
    }
    
    /* Force visibility of content */
    #root {
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    /* Ensure content is visible in preview */
    .bolt-preview-content {
      display: block !important;
      visibility: visible !important;
    }
  `;
  document.head.appendChild(style);
  
  // Mark preview as ready after a short delay
  setTimeout(() => {
    markBoltPreviewReady();
  }, 500);
};