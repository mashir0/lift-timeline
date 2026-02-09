import { fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import { ResortCard } from '@/components/ResortCard';
import type { ResortsDto, LiftsDto, LiftSegmentsByLiftId } from '@/types';

type ResortCardStreamProps = {
  resortId: string;
  dateStr: string;
  mode: 'daily' | 'weekly';
  resort: ResortsDto[number];
  lifts: LiftsDto[number];
};

export async function ResortCardStream({
  resortId,
  dateStr,
  mode,
  resort,
  lifts,
}: ResortCardStreamProps) {
  const data = await fetchOneDayLiftLogs(Number(resortId), dateStr);

  if (!data || !data.hours || Object.keys(data.liftLogs).length === 0) {
    return null;
  }

  const liftSegments: LiftSegmentsByLiftId = {};
  for (const [liftId, liftLogs] of Object.entries(data.liftLogs)) {
    liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, data.hours);
  }

  return (
    <ResortCard
      mode={mode}
      resort={resort}
      lifts={lifts}
      liftLogs={liftSegments}
      hours={data.hours}
    />
  );
}
