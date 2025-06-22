
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import i18n from './i18n' // Import the i18n instance
import { I18nextProvider } from 'react-i18next'
window.i18next = i18n;

// Check if the application is running in a browser environment
const isClient = typeof window !== 'undefined';

// For client-side hydration
if (isClient) {
  const container = document.getElementById("root");
  
  if (container) {
    createRoot(container).render(
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    );
  }
}

// This export is necessary for SSG with vite-plugin-ssr
export default App;
