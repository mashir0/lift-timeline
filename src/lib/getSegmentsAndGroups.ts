import type { liftStatus, LiftSegment, OperationStatus } from '@/types';
import dayjs from '@/util/dayjs';
import { SEGMENTS_PER_HOUR, ONE_SEGMENT_MINUTES } from './constants';

function createNoDataSegment(
  startIndex: number,
  count: number,
  createdAt: string
): LiftSegment {
  return {
    status: 'no-data' as OperationStatus,
    created_at: createdAt,
    round_created_at: createdAt,
    startIndex,
    count,
  };
}

/**
 * リフトのログから status bar のどの位置に status を表示するかを計算する。
 * availableHours は固定枠（例: 6〜20時）。dateStr はログが0件のときに基準日として使用。
 */
export const getSegmentsAndGroups = (
  liftLogs: liftStatus[],
  availableHours: number[],
  dateStr?: string
): LiftSegment[] => {
  if (availableHours.length === 0) {
    return [];
  }

  const sortedHours = [...availableHours].sort((a, b) => a - b);
  const totalSegments = sortedHours.length * SEGMENTS_PER_HOUR;

  // 基準日（JST）。ログが0件のときは dateStr から組み立てる
  const baseDate =
    liftLogs.length > 0
      ? dayjs.tz(liftLogs[0].round_created_at, 'UTC').tz('Asia/Tokyo')
      : dayjs.tz(dateStr ?? new Date(), 'Asia/Tokyo').startOf('day');

  const startTime = baseDate.hour(sortedHours[0]).minute(0).startOf('minute').utc();
  const endTime = baseDate
    .hour(sortedHours[sortedHours.length - 1] + 1)
    .minute(0)
    .startOf('minute')
    .utc();

  // ログが0件のときは全範囲を no-data の1セグメントで返す
  if (liftLogs.length === 0) {
    return [
      createNoDataSegment(0, totalSegments, startTime.toISOString()),
    ];
  }

  const now = dayjs.tz(new Date(), 'UTC');
  const nowInRange = !now.isBefore(startTime) && now.isBefore(endTime);

  const result: LiftSegment[] = [];

  const sortedLogs = [...liftLogs]
    .sort(
      (a, b) =>
        dayjs.tz(a.round_created_at, 'UTC').valueOf() -
        dayjs.tz(b.round_created_at, 'UTC').valueOf()
    )
    .filter((log) => {
      const t = dayjs.tz(log.round_created_at, 'UTC');
      return !t.isBefore(startTime) && t.isBefore(endTime);
    });

  for (let i = 0; i < sortedLogs.length; i++) {
    const currentLog = sortedLogs[i];
    const currentTime = dayjs.tz(currentLog.round_created_at, 'UTC');

    const nextTime =
      i < sortedLogs.length - 1
        ? dayjs.tz(sortedLogs[i + 1].round_created_at, 'UTC')
        : endTime;

    if (currentTime.isAfter(now)) {
      break;
    }

    // 設定時間内（リアルタイム）のときはセグメントを現在時刻で打ち切り、20時まで埋めない
    const segmentEnd =
      nowInRange && now.isBefore(nextTime) ? now : nextTime;
    const durationMinutes = Math.min(
      segmentEnd.diff(currentTime, 'minute'),
      endTime.diff(currentTime, 'minute')
    );
    const segmentCount = Math.max(
      1,
      Math.ceil(durationMinutes / ONE_SEGMENT_MINUTES)
    );
    const timeFromStart = currentTime.diff(startTime, 'minute');
    const segmentIndex = Math.floor(timeFromStart / ONE_SEGMENT_MINUTES);

    if (segmentIndex >= 0 && segmentIndex < totalSegments) {
      result.push({
        status: currentLog.status,
        created_at: currentLog.created_at,
        round_created_at: currentLog.round_created_at,
        startIndex: segmentIndex,
        count: Math.min(segmentCount, totalSegments - segmentIndex),
      });
    }
  }

  // 先頭の隙間を no-data で埋める
  if (result.length === 0 || result[0].startIndex > 0) {
    const gapCount = result.length > 0 ? result[0].startIndex : totalSegments;
    result.unshift(
      createNoDataSegment(0, gapCount, startTime.toISOString())
    );
  }

  // 隣り合うセグメント間の隙間を no-data で埋める
  const withGaps: LiftSegment[] = [];
  for (let i = 0; i < result.length; i++) {
    const seg = result[i];
    const segEnd = seg.startIndex + seg.count;
    const next = result[i + 1];
    if (next != null && segEnd < next.startIndex) {
      withGaps.push(seg);
      withGaps.push(
        createNoDataSegment(segEnd, next.startIndex - segEnd, startTime.toISOString())
      );
    } else {
      withGaps.push(seg);
    }
  }
  const filled = withGaps.length > 0 ? withGaps : result;

  // 末尾の隙間を no-data で埋める（現在時刻以降も含む）
  const lastSegment = filled[filled.length - 1];
  const lastEndIndex = lastSegment.startIndex + lastSegment.count;
  if (lastEndIndex < totalSegments) {
    filled.push(
      createNoDataSegment(
        lastEndIndex,
        totalSegments - lastEndIndex,
        startTime.toISOString()
      )
    );
  }

  return filled;
};
