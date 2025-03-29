import { getAllResorts, getAllLifts, fetchWeeklyLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs } from '@/types';

export const runtime = 'edge';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

export default async function Home() {
  try {
    const logs: AllResortsLiftLogs = {};
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);

    // リゾートごとにデータを取得
    await Promise.all(
      Object.keys(resorts).map(async (resortId) => {
        const resortLogs = await fetchWeeklyLiftLogs(Number(resortId));
        if (Object.keys(resortLogs).length > 0) {
          logs[Number(resortId)] = resortLogs;
        }
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