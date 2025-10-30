import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@supabase/supabase-js'],
  reactStrictMode: false, // Disable strict mode to prevent double effects
  experimental: {
    // Disable overlay for hydration errors in development
    optimizePackageImports: ['chart.js']
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: false,
  }
};

export default nextConfig;
