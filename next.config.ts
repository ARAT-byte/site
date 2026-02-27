import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/site',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
