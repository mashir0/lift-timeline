import dayjs from '@/util/dayjs';
import {
  LIFT_CACHE_KEY_PREFIX,
  CACHE_RETENTION_DAYS,
  LIFT_DAY_FINAL_HOUR_JST,
  ONE_SEGMENT_MINUTES,
} from './constants';
import type { LiftSegmentsByLiftId } from '@/types';

/** R2 に保存するキャッシュ値の型 */
export type LiftTimelineCacheEntry = {
  calculatedAtSegment: string;
  /** true: その日の19:00以降に計算した確定データ。false: 6〜19時の間に計算した不完全データ */
  isComplete: boolean;
  result: {
    liftSegments: LiftSegmentsByLiftId;
    hours: number[];
  };
};

/** R2Bucket 相当（get/put/delete/list を持つオブジェクト）。Cloudflare R2 バインディング互換。 */
export type R2BucketLike = {
  get(key: string): Promise<{ json(): Promise<unknown>; text(): Promise<string> } | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ objects: { key: string }[]; truncated?: boolean; cursor?: string }>;
};

/**
 * キャッシュキーを生成する。
 * 形式: lift-timeline/{dateStr}/{resortId}.json
 */
export function getCacheKey(dateStr: string, resortId: number): string {
  return `${LIFT_CACHE_KEY_PREFIX}/${dateStr}/${resortId}.json`;
}

/**
 * 現在時刻（JST）の「時間区分」を返す。
 * 区分 = (hour, floor(minute / 15)) を "hour-segmentIndex" 形式で表す。
 * 例: 10:07 → "10-0", 10:21 → "10-1"
 */
export function getCurrentSegmentKey(nowJst: dayjs.Dayjs): string {
  const hour = nowJst.hour();
  const segmentIndex = Math.floor(nowJst.minute() / ONE_SEGMENT_MINUTES);
  return `${hour}-${segmentIndex}`;
}

/**
 * 指定日付の 19:00 JST を過ぎているか判定する。
 */
export function isPastFinalHour(dateStr: string, nowJst: dayjs.Dayjs): boolean {
  const targetDay = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
  const finalTime = targetDay.hour(LIFT_DAY_FINAL_HOUR_JST).minute(0).second(0).millisecond(0);
  return nowJst.isAfter(finalTime) || nowJst.isSame(finalTime);
}

/**
 * キャッシュエントリを JSON 文字列にシリアライズする。
 */
export function serializeCacheEntry(entry: LiftTimelineCacheEntry): string {
  return JSON.stringify(entry);
}

/**
 * JSON 文字列をキャッシュエントリにデシリアライズする。
 */
export function deserializeCacheEntry(json: string): LiftTimelineCacheEntry | null {
  try {
    const parsed = JSON.parse(json) as LiftTimelineCacheEntry & { isComplete?: boolean };
    if (
      typeof parsed.calculatedAtSegment === 'string' &&
      parsed.result &&
      typeof parsed.result.liftSegments === 'object' &&
      Array.isArray(parsed.result.hours)
    ) {
      return {
        ...parsed,
        isComplete: parsed.isComplete === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 指定日数より前の dateStr かどうか。
 * 基準日は Worker env の REFERENCE_DATE（未設定なら実時刻の今日）。
 */
export function isExpiredDateStr(dateStr: string, retentionDays: number): boolean {
  const cacheDate = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
  const refDate = process.env.REFERENCE_DATE;
  const todayJst = refDate
    ? dayjs.tz(refDate, 'Asia/Tokyo').startOf('day')
    : dayjs.tz(new Date(), 'Asia/Tokyo').startOf('day');
  const cutoff = todayJst.subtract(retentionDays, 'day');
  return cacheDate.isBefore(cutoff);
}

/**
 * R2 からキャッシュを取得する。
 */
export async function getCached(
  bucket: R2BucketLike,
  dateStr: string,
  resortId: number
): Promise<LiftTimelineCacheEntry | null> {
  const key = getCacheKey(dateStr, resortId);
  const obj = await bucket.get(key);
  if (!obj) return null;
  const value = await obj.json();
  if (value && typeof value === 'object' && 'calculatedAtSegment' in value && 'result' in value) {
    const parsed = value as LiftTimelineCacheEntry & { isComplete?: boolean };
    if (Array.isArray(parsed.result?.hours) && typeof parsed.result?.liftSegments === 'object') {
      return {
        ...parsed,
        isComplete: parsed.isComplete === true,
      };
    }
  }
  const jsonStr = typeof value === 'string' ? value : JSON.stringify(value);
  return deserializeCacheEntry(jsonStr);
}

/**
 * R2 にキャッシュを保存する。
 */
export async function setCached(
  bucket: R2BucketLike,
  dateStr: string,
  resortId: number,
  entry: LiftTimelineCacheEntry
): Promise<void> {
  const key = getCacheKey(dateStr, resortId);
  const body = serializeCacheEntry(entry);
  await bucket.put(key, body, {
    httpMetadata: { contentType: 'application/json' },
  });
}

/**
 * 指定日数経過したキャッシュキーを収集し、削除する。
 * Cron から呼ぶ想定。bucket は env.LIFT_TIMELINE_CACHE_R2_BUCKET を渡す。
 */
export async function deleteExpiredCacheKeys(
  bucket: R2BucketLike,
  retentionDays: number = CACHE_RETENTION_DAYS
): Promise<number> {
  const prefix = `${LIFT_CACHE_KEY_PREFIX}/`;
  const keysToDelete: string[] = [];
  let cursor: string | undefined;
  do {
    const listResult = await bucket.list({ prefix, limit: 1000, cursor });
    for (const obj of listResult.objects) {
      const key = obj.key;
      const parts = key.slice(prefix.length).split('/');
      const dateStr = parts[0];
      if (dateStr && isExpiredDateStr(dateStr, retentionDays)) {
        keysToDelete.push(key);
      }
    }
    cursor = listResult.truncated ? listResult.cursor : undefined;
  } while (cursor);

  let deleted = 0;
  for (let i = 0; i < keysToDelete.length; i += 1000) {
    const batch = keysToDelete.slice(i, i + 1000);
    await bucket.delete(batch);
    deleted += batch.length;
  }
  return deleted;
}
