import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import BoltPreviewFallback from './components/BoltPreviewFallback'
import { isBoltPreview } from './utils/bolt-preview-helper'

// Check if the application is running in a browser environment
const isClient = typeof window !== 'undefined';

// For client-side hydration
if (isClient) {
  const container = document.getElementById("root");
  
  if (container) {
    // Wrap the app in BoltPreviewFallback to ensure compatibility
    createRoot(container).render(
      <BoltPreviewFallback>
        <App />
      </BoltPreviewFallback>
    );
    
    // For Bolt preview, ensure the preview is visible
    if (isBoltPreview()) {
      // Force the container to be visible
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      
      // Log for debugging
      console.log('Bolt preview initialized in main.tsx');
    }
  }
}

// This export is necessary for SSG with vite-plugin-ssr
export default App;