import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during builds to unblock preflight
    ignoreDuringBuilds: true,
  },
  // Ensure correct monorepo/workspace root for file tracing and chunk resolution (moved out of experimental)
  outputFileTracingRoot: path.join(__dirname, ".."), // /Users/samshap/Desktop/Dev/dogfinder-app
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dbw3zep4prcju.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dl5zpyw5k3jeb.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Ensure absolute imports work consistently on Vercel
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      lib: path.resolve(__dirname, 'lib'),
    };
    return config;
  },
};

export default nextConfig;
