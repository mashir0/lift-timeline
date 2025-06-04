import type { NextConfig } from 'next'

const config: NextConfig = {
  // 厳格モード
  reactStrictMode: true,
  // 本番環境でのソースマップを無効化
  productionBrowserSourceMaps: false,
}

export default config 