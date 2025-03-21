// 'use client'

import { getAllResorts, getAllLifts, fetchWeeklyLiftLogs } from '@/lib/supabaseDto';
// import { TimelinePage } from '@/components/TimelinePage';
import TimelinePageWrapper from '@/components/TimelinePageWrapper';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

// CloudFlare Workers上で実行するためのEdgeランタイム設定
export const runtime = 'edge';

export default async function Home() {
  try {
    const resorts: ResortsDto = await getAllResorts();
    const lifts: LiftsDto = await getAllLifts();
    const logs: AllResortsLiftLogs = {};

    // リゾートごとにデータを取得
    await Promise.all(
      Object.keys(resorts).map(async (resortId) => {
        const resortLogs = await fetchWeeklyLiftLogs(Number(resortId));
        if (Object.keys(resortLogs).length > 0) {
          logs[Number(resortId)] = resortLogs;
        }
      })
    );

    // return <TimelinePage 
    return <TimelinePageWrapper 
      // initialResorts={resorts} 
      // initialLifts={lifts} 
      // initialLogs={logs} 
      resortsData={resorts} 
      liftsData={lifts} 
      logsData={logs} 
    />;
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return <div>データの取得に失敗しました。エラー: {error instanceof Error ? error.message : String(error)}</div>;
  }
}