import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable compression to fix ERR_CONTENT_DECODING_FAILED
  compress: false,
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
  },
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['@supabase/supabase-js', '@supabase/realtime-js'],
  
  // Configure allowed image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dorosdstv5ifoevu.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'l96lqirnhnpnghk1.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Optimized webpack config to fix cache serialization issues
  webpack: (config, { isServer }) => {
    // Use memory cache to avoid large string serialization issues
    config.cache = {
      type: 'memory',
    };

    // Handle Node.js API warnings for Supabase
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Suppress specific warnings for Supabase Edge Runtime compatibility
    config.ignoreWarnings = [
      /A Node.js API is used.*which is not supported in the Edge Runtime/,
      /process\.versions/,
      /process\.version/
    ];

    if (!isServer) {
      // Optimize chunk splitting for better performance
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          // Separate Supabase chunks
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 20,
            chunks: 'all',
          },
          // Separate Radix UI chunks
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            priority: 15,
            chunks: 'all',
          },
          // Separate Lucide React chunks
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide',
            priority: 10,
            chunks: 'all',
          },
          // Separate CSS chunks to reduce serialization overhead
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
          },
        },
      };
      
      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, '.'),
      };
    }
    return config;
  },

  // Add headers for better caching
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Add rewrites to redirect favicon requests to assets directory
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/assets/favicon.ico',
      },
    ];
  },
};

export default nextConfig;
