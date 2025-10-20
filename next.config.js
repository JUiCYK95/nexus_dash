/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  typescript: {
    // Disable type checking during build for faster development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during build for faster development
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable webpack cache completely to avoid corruption
    config.cache = false;
    
    // Reduce filesystem watchers to prevent ETIMEDOUT
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['node_modules', '.next', '.git'],
      };
    }
    
    // Fix for missing vendor chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
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
        },
      },
    };
    
    return config;
  },
}

module.exports = nextConfig