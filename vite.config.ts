
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// List of routes to prerender for SEO
const routesToPrerender = [
  "/",
  "/showcase",
  "/contact",
  "/privacy",
  "/support",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Define environment variables for client-side code
  define: {
    // Ensure process.env is defined for libraries that expect it
    'process.env': {}
  },
  optimizeDeps: {
    include: ['react-markdown', 'rehype-raw']
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    // Make output directory clean on each build
    emptyOutDir: true,
    // Optimize chunks for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-toast'],
        }
      }
    }
  }
}));
