'use client'

import { getAllResorts, getAllLifts, fetchWeeklyLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

// CloudFlare Workers上で実行するためのEdgeランタイム設定
// export const runtime = 'edge';

export default async function Home() {
  try {
    // サーバー側でデータを取得
    console.log('Fetching resorts...');
    const resorts: ResortsDto = await getAllResorts();
    console.log('Resorts fetched:', resorts);

    console.log('Fetching lifts...');
    const lifts: LiftsDto = await getAllLifts();
    console.log('Lifts fetched:', lifts);
    
    // リフトステータスデータ
    const logs: AllResortsLiftLogs = {};

    // リゾートごとにデータを取得
    await Promise.all(
      Object.keys(resorts).map(async (resortId) => {
        console.log(`Fetching logs for resort ${resortId}...`);
        const resortLogs = await fetchWeeklyLiftLogs(Number(resortId));
        if (Object.keys(resortLogs).length > 0) {
          logs[Number(resortId)] = resortLogs;
        }
        console.log(`Logs fetched for resort ${resortId}:`, resortLogs);
      })
    );

    return <TimelinePage 
      initialResorts={resorts} 
      initialLifts={lifts} 
      initialLogs={logs} 
    />;
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return <div>データの取得に失敗しました。エラー: {error instanceof Error ? error.message : String(error)}</div>;
  }
}