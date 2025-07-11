import { ResortCard } from '@/components/ResortCard';
import { getResortLiftLogs } from '@/lib/actions';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import { removeDuplicateLiftLogs } from '@/lib/dataProcessing';
import type { LiftSegmentsByLiftId, DBLiftStatusView } from '@/types';

// ✅ 個別リゾートのタイムライン（Server Component）
export async function ResortTimeline({ 
  resortId, 
  resort,
  lifts,
  mode,
  dateStr 
}: { 
  resortId: number;
  resort: any;
  lifts: any;
  mode: 'daily' | 'weekly';
  dateStr: string;
}) {
  const startTime = performance.now();
  
  // リゾート単位で一括取得（生データ）
  const rawLogs = await getResortLiftLogs(resortId, dateStr);
  
  // クライアント側での処理時間計測
  const fetchTime = Number((performance.now() - startTime).toFixed(2)).toString().padStart(7, ' ');
  
  if (!rawLogs || rawLogs.length === 0) {
    return null;
  }
  
  // クライアント側でのリフトごとの振り分け処理
  const processStart = performance.now();
  const processedLifts = processResortLifts(rawLogs, lifts);
  const processTime = Number((performance.now() - processStart).toFixed(2)).toString().padStart(7, ' ');

  // セグメント変換処理（既存ロジックをそのまま使用）
  const segmentStart = performance.now();
  const liftSegments: LiftSegmentsByLiftId = {};
  const hours = extractHours(rawLogs);
  
  for (const [liftId, liftLogs] of Object.entries(processedLifts)) {
    if (liftLogs && Array.isArray(liftLogs)) {
      liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, hours);
    }
  }
  
  const segmentTime = Number((performance.now() - segmentStart).toFixed(2)).toString().padStart(7, ' ');
  console.log(`${resortId}:${resort.name.substring(0, 2)} fetch:${fetchTime}ms, proc:${processTime}ms, segment:${segmentTime}ms`);

  return (
    <ResortCard
      resort={resort}
      lifts={lifts}
      mode={mode}
      liftLogs={liftSegments}
      hours={hours}
    />
  );
}

// クライアント側でのリフトごとの振り分け処理
function processResortLifts(
  rawLogs: DBLiftStatusView[], 
  lifts: Record<number, { name: string; start_time: string; end_time: string }>
) {
  const processedLifts: Record<number, any[]> = {};
  
  // 各リフトに対して処理を実行
  Object.entries(lifts).forEach(([liftId, liftInfo]) => {
    const liftIdNum = parseInt(liftId);
    
    // リフトIDでフィルタリング（生データから取得）
    const rawLiftLogs = rawLogs.filter(log => log.lift_id === liftIdNum);
    
    // 連続する同じステータスを削除する関数を実行
    const processedLogs = removeDuplicateLiftLogs(rawLiftLogs);
    
    processedLifts[liftIdNum] = processedLogs;
  });
  
  return processedLifts;
}

// 時間の抽出（既存ロジックを参考）
function extractHours(rawLogs: DBLiftStatusView[]): number[] {
  const hours = new Set<number>();
  
  for (const log of rawLogs) {
    const hour = new Date(log.created_at).getHours();
    hours.add(hour);
  }
  
  return Array.from(hours).sort((a, b) => a - b);
} 