// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Define environment variables for client-side code
  define: {
    // Ensure process.env is defined for libraries that expect it
    "process.env": {}
  },
  optimizeDeps: {
    include: ["react-markdown", "rehype-raw"]
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    // Make output directory clean on each build
    emptyOutDir: true,
    // Output directory
    outDir: "dist",
    // Optimize chunks for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-tabs", "@radix-ui/react-toast"]
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuXG4vLyBMaXN0IG9mIHJvdXRlcyB0byBwcmVyZW5kZXIgZm9yIFNFT1xuY29uc3Qgcm91dGVzVG9QcmVyZW5kZXIgPSBbXG4gIFwiL1wiLFxuICBcIi9zaG93Y2FzZVwiLFxuICBcIi9jb250YWN0XCIsXG4gIFwiL3ByaXZhY3lcIixcbiAgXCIvc3VwcG9ydFwiLFxuICBcIi9zaWduLWluXCIsXG4gIFwiL3NpZ24tdXBcIixcbiAgXCIvZm9yZ290LXBhc3N3b3JkXCIsXG5dO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCI6OlwiLFxuICAgIHBvcnQ6IDgwODAsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgLy8gRGVmaW5lIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgY2xpZW50LXNpZGUgY29kZVxuICBkZWZpbmU6IHtcbiAgICAvLyBFbnN1cmUgcHJvY2Vzcy5lbnYgaXMgZGVmaW5lZCBmb3IgbGlicmFyaWVzIHRoYXQgZXhwZWN0IGl0XG4gICAgJ3Byb2Nlc3MuZW52Jzoge31cbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydyZWFjdC1tYXJrZG93bicsICdyZWh5cGUtcmF3J11cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBHZW5lcmF0ZSBzb3VyY2UgbWFwcyBmb3IgYmV0dGVyIGRlYnVnZ2luZ1xuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAvLyBNYWtlIG91dHB1dCBkaXJlY3RvcnkgY2xlYW4gb24gZWFjaCBidWlsZFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIC8vIE91dHB1dCBkaXJlY3RvcnlcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAvLyBPcHRpbWl6ZSBjaHVua3MgZm9yIGJldHRlciBsb2FkaW5nIHBlcmZvcm1hbmNlXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIHVpOiBbJ0ByYWRpeC11aS9yZWFjdC10YWJzJywgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSmhDLElBQU0sbUNBQW1DO0FBbUJ6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxRQUFRO0FBQUE7QUFBQSxJQUVOLGVBQWUsQ0FBQztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsa0JBQWtCLFlBQVk7QUFBQSxFQUMxQztBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxXQUFXO0FBQUE7QUFBQSxJQUVYLGFBQWE7QUFBQTtBQUFBLElBRWIsUUFBUTtBQUFBO0FBQUEsSUFFUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELElBQUksQ0FBQyx3QkFBd0IsdUJBQXVCO0FBQUEsUUFDdEQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
