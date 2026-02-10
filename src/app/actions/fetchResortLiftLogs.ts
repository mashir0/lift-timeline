'use server';

import { createClient } from '@/lib/supabase/server';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import dayjs from '@/util/dayjs';
import type { LiftSegmentsByLiftId, liftStatus, OperationStatus } from '@/types';

const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type FetchResortLiftLogsResult =
  | { ok: true; liftSegments: LiftSegmentsByLiftId; hours: number[] }
  | { ok: false; reason: 'no_data' }
  | { ok: false; reason: 'error'; message: string };

export async function fetchResortLiftLogs(
  resortId: number,
  dateStr: string
): Promise<FetchResortLiftLogsResult> {
  try {
    if (!DATE_STR_REGEX.test(dateStr)) {
      return { ok: false, reason: 'error', message: '日付の形式が不正です（YYYY-MM-DD）' };
    }
    const startDate = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
    if (!startDate.isValid()) {
      return { ok: false, reason: 'error', message: '日付が不正です' };
    }
    const endDate = startDate.endOf('day');

    const supabase = await createClient();

    const { data: liftLogsData, error } = await supabase
      .from('lift_status_view')
      .select('*')
      .eq('resort_id', resortId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching lift logs:', error);
      return { ok: false, reason: 'error', message: 'データの取得に失敗しました' };
    }

    if (!liftLogsData || liftLogsData.length === 0) {
      return { ok: false, reason: 'no_data' };
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
      return { ok: false, reason: 'no_data' };
    }

    const liftSegments: LiftSegmentsByLiftId = {};
    for (const [liftId, liftLogs] of Object.entries(groupedByLift)) {
      liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, hours);
    }

    return { ok: true, liftSegments, hours };
  } catch (err) {
    console.error('Error in fetchResortLiftLogs:', err);
    const message = err instanceof Error ? err.message : '予期せぬエラーが発生しました';
    return { ok: false, reason: 'error', message };
  }
}
