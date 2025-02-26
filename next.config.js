/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '192.168.1.15'],
  },
  // ... 他の設定
  webpack: (config, { isServer }) => {
    return config;
  },
}

module.exports = nextConfig 