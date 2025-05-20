/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['undici'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;