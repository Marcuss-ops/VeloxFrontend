/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/dark_editor_v2',
  // Note: API calls go directly to Go backend, not through Next.js rewrites
  // This avoids the Next.js <-> Go proxy loop that causes inconsistent behavior
  images: {
    domains: ['lh3.googleusercontent.com'],
    unoptimized: true,
  },
}

module.exports = nextConfig;
