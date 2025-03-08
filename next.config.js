/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      {
        protocol: 'https',
        hostname: 'nvqbxjibrfvxbknssrsw.supabase.co'
      }
    ]
  },
  // ... 他の設定
  webpack: (config, { isServer }) => {
    return config;
  },
}

module.exports = withPWA(nextConfig) 