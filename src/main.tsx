
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check if the application is running in a browser environment
const isClient = typeof window !== 'undefined';

// For client-side hydration
if (isClient) {
  const container = document.getElementById("root");
  
  if (container) {
    createRoot(container).render(<App />);
  }
}

// This export is necessary for SSG with vite-plugin-ssr
export default App;
