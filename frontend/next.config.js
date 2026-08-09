/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Izinkan avatar Google (lh3.googleusercontent.com) & Supabase storage.
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

const withPWA = require('next-pwa')({
  dest:            'public',
  register:        true,
  skipWaiting:     true,
  disable:         process.env.NODE_ENV === 'development',
})

// Menyelesaikan konfigurasi
module.exports = withPWA(nextConfig)
