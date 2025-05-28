import { getAllResorts, getAllLifts } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs, LiftSegmentsByLiftId } from '@/types';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';
import PerformanceMonitor from '@/util/performance';
import { headers } from 'next/headers';

export const runtime = 'edge';
// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

// バッチサイズを定義（同時実行数を制限）
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
    
    // 1. 基本情報の取得
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);
    
    // 2. リゾートごとにリフトログデータを取得
    const resortIds = Object.keys(resorts);
    const logs: AllResortsLiftLogs = {};
    
    // 現在のリクエストのヘッダーからホスト情報を取得
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    console.log('env', process.env.ENVIRONMENT);
    const protocol = process.env.ENVIRONMENT === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // バッチ処理でリクエストを制限
    for (let i = 0; i < resortIds.length; i += BATCH_SIZE) {
      const batch = resortIds.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (resortId) => {
        try {
          const response = await fetch( `${baseUrl}/api/lift-logs/${resortId}?date=${dateStr}`, { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
          if (!response.ok) {
            console.error(`Failed to fetch logs for resort ${resortId}`);
            return null;
          }
          const data = await response.json();
          return { resortId, data };
        } catch (error) {
          console.error(`Error fetching logs for resort ${resortId}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // バッチの結果を処理
      batchResults.forEach(result => {
        if (result && Object.keys(result.data.liftSegments).length > 0) {
          logs[Number(result.resortId)] = {
            [dateStr]: result.data
          };
        }
      });
    }
    
    console.log(`Processed ${Object.keys(logs).length} resorts for date ${dateStr}`);
    
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