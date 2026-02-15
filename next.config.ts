import type { NextConfig } from 'next'

const config: NextConfig = {
  // 厳格モード
  reactStrictMode: true,
  // プレビュー時のデバッグ用にブラウザソースマップを有効化
  productionBrowserSourceMaps: true,
}

export default config

// next dev 時に getCloudflareContext / R2 等をローカルエミュレート（Miniflare）で使う
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()