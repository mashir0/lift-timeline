import { getAllResorts, getAllLifts } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { OneDayLiftLogs } from '@/types';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

// バッチサイズを定義（同時実行数を制限）
const BATCH_SIZE = 2;

export default async function Home(props: { searchParams: Promise<{ date?: string }>}) {
  const startTime = Date.now();
  console.log('🚀 [page.tsx] 処理開始:', new Date().toISOString());
  
  const searchParams = await props.searchParams;
  // 日付パラメータがない場合は本日の日付にリダイレクト
  const dateParam = searchParams.date as string | undefined;
  if (!dateParam) {
    redirect(`/?date=${todayStr}`);
  }

  // 日付のバリデーション
  const date = dayjs.tz(dateParam,'UTC').tz('Asia/Tokyo');
  if (!date.isValid()) {
    redirect(`/?date=${todayStr}`);
  }

  const dateStr = date.format('YYYY-MM-DD');
  console.log('📅 [page.tsx] 日付処理完了:', dateStr, '経過時間:', Date.now() - startTime, 'ms');

  try {
    // 1. 基本情報の取得
    console.log('🏔️ [page.tsx] 基本情報取得開始');
    const basicInfoStart = Date.now();
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts()
    ]);
    console.log('✅ [page.tsx] 基本情報取得完了:', {
      resortsCount: Object.keys(resorts).length,
      liftsCount: Object.keys(lifts).length,
      duration: Date.now() - basicInfoStart,
      unit: 'ms'
    });
    
    // 2. リゾートごとにリフトログデータを取得
    const resortIds = Object.keys(resorts);
    const logs: { [resrotId: number]: OneDayLiftLogs } = {};
    
    console.log('🔄 [page.tsx] リゾートデータ取得開始:', resortIds.length, '件');
    const resortDataStart = Date.now();
    
    // 現在のリクエストのヘッダーからホスト情報を取得
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = 'http'; // 開発環境では常にhttpを使用
    const baseUrl = `${protocol}://${host}`;
    
    // バッチ処理でリクエストを制限
    for (let i = 0; i < resortIds.length; i += BATCH_SIZE) {
      const batch = resortIds.slice(i, i + BATCH_SIZE);
      console.log(`📦 [page.tsx] バッチ処理 ${i/BATCH_SIZE + 1}:`, batch);
      const batchStart = Date.now();
      
      const batchPromises = batch.map(async (resortId) => {
        try {
          const apiStart = Date.now();
          const response = await fetch( `${baseUrl}/api/lift-logs/${resortId}?date=${dateStr}`, { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
          if (!response.ok) {
            console.error(`❌ [page.tsx] Failed to fetch logs for resort ${resortId}`);
            return null;
          }
          const data = await response.json();
          console.log(`✅ [page.tsx] リゾート ${resortId} 取得完了:`, {
            dataSize: Object.keys(data.liftLogs).length,
            duration: Date.now() - apiStart,
            unit: 'ms'
          });
          return { resortId, data };
        } catch (error) {
          console.error(`❌ [page.tsx] Error fetching logs for resort ${resortId}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      console.log(`✅ [page.tsx] バッチ ${i/BATCH_SIZE + 1} 完了:`, {
        duration: Date.now() - batchStart,
        unit: 'ms'
      });
      
      // バッチの結果を処理
      batchResults.forEach(result => {
        if (result && Object.keys(result.data.liftLogs).length > 0) {
          logs[Number(result.resortId)] = result.data
        }
      });
    }
    
    console.log('🎉 [page.tsx] 全処理完了:', {
      totalDuration: Date.now() - startTime,
      unit: 'ms',
      resortsCount: Object.keys(logs).length
    });
    
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
    console.error('❌ [page.tsx] Error fetching data:', error);
    // エラー時のフォールバックUIを表示
    return (
      <div>
        <h1>Error</h1>
      </div>
    );
  }
}