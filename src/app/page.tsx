import { getAllResorts, getAllLifts, fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs } from '@/types';
import dayjs from '@/util/dayjs';

export const runtime = 'edge';
// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025/04/18', 'Asia/Tokyo');
const todayStr = today.format('YYYY-MM-DD');

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
        const resortLogs = await fetchOneDayLiftLogs(Number(resortId), todayStr);
        if (Object.keys(resortLogs).length > 0) {
          // リゾートIDのオブジェクトが存在しない場合は初期化
          if (!logs[Number(resortId)]) {
            logs[Number(resortId)] = {};
          }
          logs[Number(resortId)][todayStr] = resortLogs;
        }
      })
    );
    
    return <TimelinePage 
      initialResorts={resorts} 
      initialLifts={lifts} 
      initialLogs={logs} 
      todayString={todayStr}
    />;
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return <div>データの取得に失敗しました。エラー: {error instanceof Error ? error.message : String(error)}</div>;
  }
}