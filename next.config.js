/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.svgrepo.com', 'lh3.googleusercontent.com'],
  },
  // Increase API body size limit for large JSON uploads (instances)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig 