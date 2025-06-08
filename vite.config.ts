import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Define environment variables for client-side code
  define: {
    // Ensure process.env is defined for libraries that expect it
    'process.env': {},
    // Add a global flag for Bolt preview detection
    '__BOLT_PREVIEW__': JSON.stringify(true),
  },
  optimizeDeps: {
    include: ['react-markdown', 'rehype-raw']
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    // Make output directory clean on each build
    emptyOutDir: true,
    // Output directory
    outDir: 'dist',
    // Optimize chunks for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-toast']
        }
      }
    }
  }
}));