/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['opub-ui', 'echarts', 'lucide-react'],
    serverComponentsExternalPackages: ['leaflet', 'react-leaflet', 'react-leaflet-fullscreen'],
  },
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
