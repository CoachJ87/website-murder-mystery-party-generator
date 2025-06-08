// prerender.js - Script to pre-render specific routes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from './src/entry-server.js';

// Convert ESM URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes to pre-render
const routes = [
  '/',
  '/showcase',
  '/contact',
  '/privacy',
  '/support',
];

// Read the template
const template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');

// Pre-render each route
async function prerender() {
  for (const route of routes) {
    const appHtml = render(route);
    
    // Add SEO meta tags based on the route
    let title = 'Murder Mystery Party Generator';
    let description = 'Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events.';
    
    if (route === '/showcase') {
      title = 'Showcase | Murder Mystery Party Generator';
      description = 'Browse our collection of murder mystery scenarios and get inspired for your next event.';
    } else if (route === '/contact') {
      title = 'Contact Us | Murder Mystery Party Generator';
      description = 'Get in touch with our team for support or inquiries about our murder mystery generator.';
    } else if (route === '/privacy') {
      title = 'Privacy Policy | Murder Mystery Party Generator';
      description = 'Learn about how we protect your data and privacy when using our murder mystery generator.';
    } else if (route === '/support') {
      title = 'Support | Murder Mystery Party Generator';
      description = 'Find answers to common questions and get help with our murder mystery generator.';
    }
    
    // Insert SEO meta tags and rendered app HTML
    const html = template
      .replace('<title>loving-without-attachments</title>', `<title>${title}</title>`)
      .replace('<meta name="description" content="Lovable Generated Project" />', `<meta name="description" content="${description}" />`)
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      .replace('</head>', `
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://murder-mystery.party${route}" />
        <meta property="og:image" content="https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true" />
        </head>
      `);
    
    // Create the output directory
    const outDir = path.join(__dirname, 'dist', route === '/' ? '' : route);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Write the HTML file
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`Pre-rendered: ${route}`);
  }
}

prerender().catch(console.error);