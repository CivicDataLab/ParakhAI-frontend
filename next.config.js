/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  transpilePackages: ['opub-ui'],
  swcMinify: false,
  // experimental: {
  //   optimizePackageImports: ['opub-ui','echarts', 'lucide-react'],
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
