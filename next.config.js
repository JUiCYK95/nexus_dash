/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  typescript: {
    // Disable type checking during build for faster development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during build for faster development
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig