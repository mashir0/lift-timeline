import { getAllResorts, getAllLifts } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

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
    // ✅ 軽量化: 1つの軽量なデータフェッチのみ
    console.log('🏔️ [page.tsx] 基本情報取得開始');
    const basicInfoStart = Date.now();
    
    // 軽量化されたデータフェッチ関数
    const basicData = await fetchBasicData();
    
    console.log('✅ [page.tsx] 基本情報取得完了:', {
      resortsCount: Object.keys(basicData.resorts).length,
      liftsCount: Object.keys(basicData.lifts).length,
      duration: Date.now() - basicInfoStart,
      unit: 'ms'
    });
    
    console.log('🎉 [page.tsx] 全処理完了:', {
      totalDuration: Date.now() - startTime,
      unit: 'ms'
    });
    
    return (
      <TimelinePage 
        resorts={basicData.resorts}
        lifts={basicData.lifts}
        todayString={todayStr}
        dateStr={dateStr}
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

// ✅ 軽量化されたデータフェッチ関数
async function fetchBasicData() {
  // 既存の関数を使用して軽量化
  const [resorts, lifts] = await Promise.all([
    getAllResorts(),
    getAllLifts()
  ]);
  
  return { resorts, lifts };
}