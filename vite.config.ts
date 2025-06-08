import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { Plugin } from "vite";

// List of routes to prerender for SEO
const routesToPrerender = [
  "/",
  "/showcase",
  "/contact",
  "/privacy",
  "/support",
];

// Custom SSG plugin
function viteSsgPlugin(): Plugin {
  return {
    name: 'vite-plugin-ssg',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      console.log('Starting static site generation...');
      
      const fs = await import('fs');
      const { renderToString } = await import('react-dom/server');
      const { createElement } = await import('react');
      
      // Import the App component
      const { default: App } = await import('./src/App');
      
      // Create dist directory if it doesn't exist
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist');
      }
      
      // Read the index.html template
      const template = fs.readFileSync('dist/index.html', 'utf-8');
      
      // Process each route
      for (const route of routesToPrerender) {
        console.log(`Pre-rendering route: ${route}`);
        
        try {
          // Create a mock window.location for SSR
          global.window = {
            location: {
              pathname: route,
              search: '',
              hash: '',
              href: `http://localhost${route}`,
              origin: 'http://localhost',
            },
          } as any;
          
          // Render the app to string
          const appHtml = renderToString(createElement(App));
          
          // Insert the rendered app into the HTML template
          const html = template.replace(
            '<div id="root"></div>',
            `<div id="root">${appHtml}</div>`
          );
          
          // Add meta tags for SEO
          const seoHtml = html.replace(
            '</head>',
            `
              <meta name="description" content="Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events." />
              <meta property="og:title" content="Murder Mystery Party Generator" />
              <meta property="og:description" content="Generate unique murder mystery party scenarios with our AI-powered tool." />
              <meta property="og:type" content="website" />
              <meta property="og:url" content="https://murder-mystery.party${route}" />
              <meta property="og:image" content="https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true" />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content="Murder Mystery Party Generator" />
              <meta name="twitter:description" content="Generate unique murder mystery party scenarios with our AI-powered tool." />
              <meta name="twitter:image" content="https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true" />
            </head>`
          );
          
          // Create the output directory if it doesn't exist
          const outputDir = path.join('dist', route === '/' ? '' : route);
          if (!fs.existsSync(outputDir) && outputDir !== 'dist') {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          // Write the HTML file
          const outputPath = path.join(outputDir, route === '/' ? 'index.html' : 'index.html');
          fs.writeFileSync(outputPath, seoHtml);
          
          console.log(`Successfully pre-rendered: ${route}`);
        } catch (error) {
          console.error(`Error pre-rendering route ${route}:`, error);
        }
      }
      
      console.log('Static site generation completed');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && viteSsgPlugin(),
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
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-toast']
        }
      }
    }
  }
}));