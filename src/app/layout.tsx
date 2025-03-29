import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

export const runtime = 'edge';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ski Lift Timeline',
  description: 'スキーリフトの運行状況をタイムラインで確認できます',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}