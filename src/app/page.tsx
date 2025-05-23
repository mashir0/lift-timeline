import { getAllResorts, getAllLifts, fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs } from '@/types';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';

export const runtime = 'edge';
// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

// バッチサイズを定義
const BATCH_SIZE = 3;

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
    const logs: AllResortsLiftLogs = {};
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);
    
    // リゾートIDを配列に変換
    const resortIds = Object.keys(resorts).map(Number);
    
    // バッチ処理
    for (let i = 0; i < resortIds.length; i += BATCH_SIZE) {
      const batch = resortIds.slice(i, i + BATCH_SIZE);
      
      // バッチ内のリゾートのデータを並行して取得
      await Promise.all(
        batch.map(async (resortId) => {
          const resortLogs = await fetchOneDayLiftLogs(resortId, dateStr);
          if (Object.keys(resortLogs.liftSegments).length > 0) {
            // リゾートIDのオブジェクトが存在しない場合は初期化
            if (!logs[resortId]) {
              logs[resortId] = {};
            }
            logs[resortId][dateStr] = resortLogs;
          }
        })
      );
      
      // バッチ間で少し待機（リソース解放のため）
      if (i + BATCH_SIZE < resortIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return <TimelinePage 
      initialResorts={resorts} 
      initialLifts={lifts} 
      initialLogs={logs} 
      todayString={todayStr}
      isLoading={false}
    />;
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return <div>データの取得に失敗しました。エラー: {error instanceof Error ? error.message : String(error)}</div>;
  }
}