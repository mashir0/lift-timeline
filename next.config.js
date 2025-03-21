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
  },
  // output: 'export',  // 静的ファイルとして出力をコメントアウト
  distDir: '.vercel/output/static'  // CloudFlare Pages用の出力ディレクトリ
}

module.exports = nextConfig