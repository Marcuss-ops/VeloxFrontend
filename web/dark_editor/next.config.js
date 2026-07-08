/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/dark_editor_v2',
  // Force absolute data directory so upload and fetch routes use the same path
  // (Next.js sandboxes routes in different bundles with different process.cwd())
  env: {
    DARK_EDITOR_DATA_DIR: '/opt/velox/current/dark_editor/data',
  },
  // Note: API calls go directly to Go backend, not through Next.js rewrites
  // This avoids the Next.js <-> Go proxy loop that causes inconsistent behavior
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com', 'lh3.googleusercontent.com'],
    unoptimized: true,
  },
}

module.exports = nextConfig;
