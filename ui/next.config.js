/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_REGISTRY_NAME: process.env.NEXT_PUBLIC_REGISTRY_NAME || 'Official Carbon Credit Registry',
  },
}

module.exports = nextConfig
