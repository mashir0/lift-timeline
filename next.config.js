/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
    cpus: 1
  },
  // Cloudflare Workersでの実行を最適化
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig