import { ResortCard } from '@/components/ResortCard';
import { getResortLiftLogs } from '@/lib/actions';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import type { LiftSegmentsByLiftId } from '@/types';

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
  // 1つのリゾートのログのみ取得
  const logs = await getResortLiftLogs(resortId, dateStr);
  
  if (!logs || Object.keys(logs.liftLogs).length === 0) {
    return null;
  }
  
  const liftSegments: LiftSegmentsByLiftId = {};
  
  for (const [liftId, liftLogs] of Object.entries(logs.liftLogs)) {
    if (liftLogs && Array.isArray(liftLogs)) {
      liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, logs.hours);
    }
  }

  return (
    <ResortCard
      resort={resort}
      lifts={lifts}
      mode={mode}
      liftLogs={liftSegments}
      hours={logs.hours}
    />
  );
} 