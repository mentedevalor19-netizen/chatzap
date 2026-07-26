import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ['@wa-crm/shared'],
};

export default nextConfig;
