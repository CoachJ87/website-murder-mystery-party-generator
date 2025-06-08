/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Server Components
  reactStrictMode: true,
  
  // Optimize build output
  swcMinify: true,
  
  // Configure image domains for Next.js Image component
  images: {
    domains: ['images.unsplash.com', 'github.com'],
  },
  
  // Preserve existing API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Transpile specific modules
  transpilePackages: ['@supabase/auth-helpers-nextjs'],
  
  // Handle redirects
  async redirects() {
    return [
      {
        source: '/payment-success',
        destination: '/',
        permanent: false,
      },
      {
        source: '/payment-canceled',
        destination: '/',
        permanent: false,
      },
    ];
  },
  
  // Configure experimental features
  experimental: {
    // Enable App Router
    appDir: true,
    
    // Optimize server components
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Configure webpack to handle specific file types
  webpack(config) {
    // Handle SVG files
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    return config;
  },
  
  // Configure output directory
  distDir: '.next',
  
  // Configure trailing slashes
  trailingSlash: false,
  
  // Configure source maps
  productionBrowserSourceMaps: false,
  
  // Configure TypeScript
  typescript: {
    // Ignore TypeScript errors in production build
    ignoreBuildErrors: false,
  },
  
  // Configure ESLint
  eslint: {
    // Ignore ESLint errors in production build
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;