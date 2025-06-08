import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check if the application is running in a browser environment
const isClient = typeof window !== 'undefined';

// For client-side hydration
if (isClient) {
  const container = document.getElementById("root");
  
  if (container) {
    // Check if the container has server-rendered content
    if (container.innerHTML !== '') {
      // Hydrate the existing server-rendered content
      createRoot(container).render(<App />);
    } else {
      // Regular client-side rendering if no server-rendered content
      createRoot(container).render(<App />);
    }
  }
}

// This export is necessary for SSG with vite-plugin-ssr
export default App;