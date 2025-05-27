import { getAllResorts, getAllLifts, fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs } from '@/types';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';
import PerformanceMonitor from '@/util/performance';

export const runtime = 'edge';
// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

// バッチサイズを定義（CPUタイムアウト対策で1に変更）
const BATCH_SIZE = 2;

export default async function Home({ searchParams,}: { searchParams: { date?: string }}) {
  // 日付パラメータがない場合は本日の日付にリダイレクト
  if (!searchParams.date) {
    redirect(`/?date=${todayStr}`);
  }

  // 日付のバリデーション
  const date = dayjs.tz(searchParams.date,'UTC').tz('Asia/Tokyo');
  if (!date.isValid()) {
    redirect(`/?date=${todayStr}`);
  }

  const dateStr = date.format('YYYY-MM-DD');

  try {
    PerformanceMonitor.start('page-load-total');
    
    const logs: AllResortsLiftLogs = {};
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);
    
    // リゾートIDを配列に変換
    const resortIds = Object.keys(resorts).map(Number);
    
    console.log(`Processing ${resortIds.length} resorts for date ${dateStr}`);
    
    // バッチ処理
    for (let i = 0; i < resortIds.length; i += BATCH_SIZE) {
      const batch = resortIds.slice(i, i + BATCH_SIZE);
      
      // バッチ内のリゾートのデータを並行して取得
      await Promise.all(
        batch.map(async (resortId) => {
          try {
            const resortLogs = await fetchOneDayLiftLogs(resortId, dateStr);
            if (Object.keys(resortLogs.liftSegments).length > 0) {
              // リゾートIDのオブジェクトが存在しない場合は初期化
              if (!logs[resortId]) {
                logs[resortId] = {};
              }
              logs[resortId][dateStr] = resortLogs;
            }
          } catch (error) {
            // 個別のエラーは無視して処理を継続
            console.error(`Error fetching logs for resort ${resortId}:`, error);
          }
        })
      );
    }
    
    const totalMetrics = PerformanceMonitor.end('page-load-total');
    console.log('Page load パフォーマンス:', {
      totalDuration: totalMetrics.duration,
      resortsProcessed: Object.keys(logs).length,
      dateStr: dateStr
    });
    
    return (
      <TimelinePage 
        initialResorts={resorts} 
        initialLifts={lifts} 
        initialLogs={logs} 
        todayString={todayStr}
        isLoading={false}
      />
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return (
      <TimelinePage 
        initialResorts={{}}
        initialLifts={{}}
        initialLogs={{}}
        todayString={todayStr}
        isLoading={false}
      />
    );
  }
}