/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
    cpus: 1
  }
}

module.exports = nextConfig