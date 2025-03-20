import { getAllResorts, getAllLifts, fetchWeeklyLiftLogs } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';

export default async function Home() {
  // サーバー側でデータを取得
  const resorts: ResortsDto = await getAllResorts();
  const lifts: LiftsDto = await getAllLifts();
  
  // リフトステータスデータ
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

  return <TimelinePage 
    initialResorts={resorts} 
    initialLifts={lifts} 
    initialLogs={logs} 
  />;
}