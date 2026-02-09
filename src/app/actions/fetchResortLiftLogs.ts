'use server';

import { createClient } from '@/lib/supabase/server';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import dayjs from '@/util/dayjs';
import type { LiftSegmentsByLiftId, liftStatus, OperationStatus } from '@/types';

export async function fetchResortLiftLogs(
  resortId: number,
  dateStr: string
): Promise<{ liftSegments: LiftSegmentsByLiftId; hours: number[] } | null> {
  try {
    const supabase = await createClient();

    const startDate = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
    const endDate = startDate.endOf('day');

    const { data: liftLogsData, error } = await supabase
      .from('lift_status_view')
      .select('*')
      .eq('resort_id', resortId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching lift logs:', error);
      return null;
    }

    if (!liftLogsData || liftLogsData.length === 0) {
      return null;
    }

    const groupedByLift: { [liftId: number]: liftStatus[] } = {};
    const hoursSet = new Set<number>();

    liftLogsData.forEach((log: { lift_id: number; created_at: string; status: string }) => {
      const liftId = log.lift_id;
      const createdAt = dayjs.tz(log.created_at, 'UTC').tz('Asia/Tokyo');
      const hour = createdAt.hour();

      hoursSet.add(hour);

      if (!groupedByLift[liftId]) {
        groupedByLift[liftId] = [];
      }

      groupedByLift[liftId].push({
        status: log.status as OperationStatus,
        created_at: log.created_at,
        round_created_at: log.created_at,
      });
    });

    const hours = Array.from(hoursSet).sort((a, b) => a - b);

    if (Object.keys(groupedByLift).length === 0 || hours.length === 0) {
      return null;
    }

    const liftSegments: LiftSegmentsByLiftId = {};
    for (const [liftId, liftLogs] of Object.entries(groupedByLift)) {
      liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, hours);
    }

    return { liftSegments, hours };
  } catch (err) {
    console.error('Error in fetchResortLiftLogs:', err);
    return null;
  }
}
