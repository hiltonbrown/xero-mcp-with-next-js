import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@modelcontextprotocol/sdk', '@prisma/client', 'xero-node'],
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  
};

export default nextConfig;
