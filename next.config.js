/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,  // 厳格モード

  // SWC (Rust ベースのコンパイラ) を使用してコードを最小化します
  // Babel よりも高速で、Cloudflare のような軽量環境でのデプロイに適しています
  swcMinify: true,

  // Cloudflare Pages にデプロイするために必要な自己完結型のビルド出力を生成します
  // 依存関係を含む完全な Node.js サーバーを生成し、Cloudflare Workers で実行できるようにします
  output: 'standalone',

  experimental: {
    instrumentationHook: true,
  },
  
  // CloudFlare Workers環境ではNext.jsの画像最適化が完全にサポートされていないため
  images: {
    unoptimized: true,
  },
  
  // SSG設定 - CloudFlare WorkersでのSSRを使用するためコメントアウト維持
  // output: 'export',

  // Vercel特有の設定なのでコメントアウト維持
  // distDir: '.vercel/output/static'
  
  // 本番環境でのソースマップを無効化
  productionBrowserSourceMaps: false,  
}
module.exports = nextConfig
