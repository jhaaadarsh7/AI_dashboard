import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@supabase/supabase-js']
};

export default nextConfig;
