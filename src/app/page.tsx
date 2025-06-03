import { getAllResorts, getAllLifts } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { OneDayLiftLogs } from '@/types';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';
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
    // 1. 基本情報の取得
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);
    
    // 2. リゾートごとにリフトログデータを取得
    const resortIds = Object.keys(resorts);
    const logs: { [resrotId: number]: OneDayLiftLogs } = {};
    
    // 現在のリクエストのヘッダーからホスト情報を取得
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = 'http'; // 開発環境では常にhttpを使用
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
        if (result && Object.keys(result.data.liftLogs).length > 0) {
          logs[Number(result.resortId)] = result.data
        }
      });
    }
    
  return (
      <TimelinePage 
        resorts={resorts} 
        lifts={lifts} 
        logs={logs} 
        todayString={todayStr}
        isLoading={false}
      />
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return (
      <div>
        <h1>Error</h1>
      </div>
    );
  }
}