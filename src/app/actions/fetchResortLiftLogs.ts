'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import { fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import {
  getCached,
  setCached,
  getCurrentSegmentKey,
  isPastFinalHour,
  isExpiredDateStr,
  type R2BucketLike,
  type LiftTimelineCacheEntry,
} from '@/lib/liftTimelineCache';
import { CACHE_RETENTION_DAYS } from '@/lib/constants';
import dayjs from '@/util/dayjs';
import type { LiftSegmentsByLiftId } from '@/types';

const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type FetchResortLiftLogsResult =
  | { ok: true; liftSegments: LiftSegmentsByLiftId; hours: number[] }
  | { ok: false; reason: 'no_data' }
  | { ok: false; reason: 'error'; message: string };

/**
 * 計算結果を返却用の結果に変換する。
 */
function toResult(liftSegments: LiftSegmentsByLiftId, hours: number[]): FetchResortLiftLogsResult {
  return { ok: true, liftSegments, hours };
}

/**
 * 指定リゾート・日付のリフトログを取得し、タイムライン用のセグメント・時間を返す。
 * R2 キャッシュありの場合はそれを返し、なければ fetchOneDayLiftLogs ＋ getSegmentsAndGroups で計算してキャッシュする。
 */
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
    if (isExpiredDateStr(dateStr, CACHE_RETENTION_DAYS)) {
      return { ok: false, reason: 'no_data' };
    }

    const nowJst = dayjs.tz(new Date(), 'Asia/Tokyo');
    let bucket: R2BucketLike | undefined;
    try {
      const ctx = await getCloudflareContext({ async: true });
      const env = ctx.env as { LIFT_TIMELINE_CACHE_R2_BUCKET?: R2BucketLike };
      bucket = env.LIFT_TIMELINE_CACHE_R2_BUCKET;
    } catch {
      bucket = undefined;
    }

    if (bucket) {
      const cached = await getCached(bucket, dateStr, resortId);
      if (cached) {
        if (cached.isComplete) {
          return toResult(cached.result.liftSegments, cached.result.hours);
        }
        if (!isPastFinalHour(dateStr, nowJst)) {
          const currentSegment = getCurrentSegmentKey(nowJst);
          if (cached.calculatedAtSegment === currentSegment) {
            return toResult(cached.result.liftSegments, cached.result.hours);
          }
        }
      }
    }

    const { liftLogs, hours } = await fetchOneDayLiftLogs(resortId, dateStr);

    if (Object.keys(liftLogs).length === 0 || hours.length === 0) {
      return { ok: false, reason: 'no_data' };
    }

    const liftSegments: LiftSegmentsByLiftId = {};
    for (const [liftId, logs] of Object.entries(liftLogs)) {
      liftSegments[Number(liftId)] = getSegmentsAndGroups(logs, hours);
    }

    if (bucket) {
      const entry: LiftTimelineCacheEntry = {
        calculatedAtSegment: getCurrentSegmentKey(nowJst),
        isComplete: isPastFinalHour(dateStr, nowJst),
        result: { liftSegments, hours },
      };
      await setCached(bucket, dateStr, resortId, entry);
    }

    return toResult(liftSegments, hours);
  } catch (err) {
    console.error('Error in fetchResortLiftLogs:', err);
    const message = err instanceof Error ? err.message : '予期せぬエラーが発生しました';
    return { ok: false, reason: 'error', message };
  }
}
