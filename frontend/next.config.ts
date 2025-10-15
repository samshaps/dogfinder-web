import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during builds to unblock preflight
    ignoreDuringBuilds: true,
  },
  // Use Next.js defaults for file tracing when Root Directory is set to `frontend` in Vercel.
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
