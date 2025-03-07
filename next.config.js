/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
  images: {
    domains: process.env.NODE_ENV === 'development'
      ? ['localhost', '192.168.1.15', process.env.NEXT_PUBLIC_SUPABASE_DOMAIN]
      : [process.env.NEXT_PUBLIC_SUPABASE_DOMAIN],
  },
  // ... 他の設定
  webpack: (config, { isServer }) => {
    return config;
  },
}

module.exports = withPWA(nextConfig) 