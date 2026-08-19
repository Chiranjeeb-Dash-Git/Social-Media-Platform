/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pg-native'],
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'utf-8-validate': false,
      'bufferutil': false,
      'pg-native': false,
    };
    return config;
  },
}

module.exports = nextConfig
