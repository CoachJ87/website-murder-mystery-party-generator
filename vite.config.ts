
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Only import and use the componentTagger in development mode
  const plugins = [react()];
  
  if (mode === 'development') {
    // Dynamically import in development only
    try {
      const { componentTagger } = require("lovable-tagger");
      plugins.push(componentTagger());
    } catch (e) {
      console.warn('Could not load lovable-tagger, continuing without it');
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define environment variables for client-side code
    define: {
      // Ensure process.env is defined for libraries that expect it
      'process.env': {}
    }
  };
});
