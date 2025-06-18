import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/i18n/locales/*.json',
          dest: 'locales'
        }
      ]
    })
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
    // Output directory
    outDir: 'dist',
    // Optimize chunks for better loading performance
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-toast']
        }
      }
    }
  }
}));
