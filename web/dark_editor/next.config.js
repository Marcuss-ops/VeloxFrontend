/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Technical compatibility boundary for the separately deployed editor.
  // Product navigation uses the server-issued editor_url instead.
  basePath: '/instaeditor',
  // Note: API calls go directly to Go backend, not through Next.js rewrites
  // This avoids the Next.js <-> Go proxy loop that causes inconsistent behavior
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com', 'lh3.googleusercontent.com'],
    unoptimized: true,
  },
}

module.exports = nextConfig;
