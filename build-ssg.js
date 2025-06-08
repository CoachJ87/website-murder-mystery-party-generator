#!/usr/bin/env node

/**
 * Script to build the site with SSG for specific routes
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes to pre-render
const ROUTES_TO_PRERENDER = [
  '/',
  '/showcase',
  '/contact',
  '/privacy',
  '/support',
];

console.log('🚀 Starting SSG build process...');

try {
  // Step 1: Build the application
  console.log('📦 Building the application...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Step 2: Run the prerender script
  console.log('🔍 Pre-rendering routes...');
  
  // Import the entry-server module
  import('./src/entry-server.js').then(({ render }) => {
    // Read the template
    const template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
    
    // Process each route
    for (const route of ROUTES_TO_PRERENDER) {
      console.log(`  Pre-rendering: ${route}`);
      
      try {
        // Render the app to string
        const appHtml = render(route);
        
        // Get route-specific metadata
        const metadata = getRouteMetadata(route);
        
        // Insert the rendered app and metadata into the HTML template
        const html = template
          .replace('<title>Murder Mystery Party Generator</title>', `<title>${metadata.title}</title>`)
          .replace('<meta name="description" content="Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events." />', 
                   `<meta name="description" content="${metadata.description}" />`)
          .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
          .replace('</head>', `
            <meta property="og:title" content="${metadata.title}" />
            <meta property="og:description" content="${metadata.description}" />
            <meta property="og:url" content="https://murder-mystery.party${route}" />
            </head>
          `);
        
        // Create the output directory
        const outDir = path.join(__dirname, 'dist', route === '/' ? '' : route);
        if (!fs.existsSync(outDir) && outDir !== path.join(__dirname, 'dist')) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        
        // Write the HTML file
        const outputPath = path.join(outDir, 'index.html');
        fs.writeFileSync(outputPath, html);
        
        console.log(`  ✅ Successfully pre-rendered: ${route}`);
      } catch (error) {
        console.error(`  ❌ Error pre-rendering ${route}:`, error);
      }
    }
    
    console.log('🎉 SSG build completed successfully!');
  }).catch(error => {
    console.error('❌ Failed to import entry-server module:', error);
  });
  
} catch (error) {
  console.error('❌ Build process failed:', error);
  process.exit(1);
}

// Helper function to get metadata for a specific route
function getRouteMetadata(route) {
  const defaultMetadata = {
    title: 'Murder Mystery Party Generator',
    description: 'Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events.'
  };
  
  const routeMetadata = {
    '/': defaultMetadata,
    '/showcase': {
      title: 'Showcase | Murder Mystery Party Generator',
      description: 'Browse our collection of murder mystery scenarios and get inspired for your next event.'
    },
    '/contact': {
      title: 'Contact Us | Murder Mystery Party Generator',
      description: 'Get in touch with our team for support or inquiries about our murder mystery generator.'
    },
    '/privacy': {
      title: 'Privacy Policy | Murder Mystery Party Generator',
      description: 'Learn about how we protect your data and privacy when using our murder mystery generator.'
    },
    '/support': {
      title: 'Support | Murder Mystery Party Generator',
      description: 'Find answers to common questions and get help with our murder mystery generator.'
    }
  };
  
  return routeMetadata[route] || defaultMetadata;
}