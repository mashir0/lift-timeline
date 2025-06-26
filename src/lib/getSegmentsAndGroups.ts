import type { liftStatus, LiftSegment, OperationStatus } from '@/types';
import dayjs from '@/util/dayjs';
import { SEGMENTS_PER_HOUR, ONE_SEGMENT_MINUTES } from './constants';


// リフトのログからstatus barのどの位置にstatusを表示するかを計算する（改善版）
export const getSegmentsAndGroups = (
  liftLogs: liftStatus[], 
  availableHours: number[]): LiftSegment[] => {

  if (liftLogs.length === 0 || availableHours.length === 0) {
    return [];
  }

  const now = dayjs.tz(new Date(), 'UTC');
  const sortedHours = availableHours.sort((a, b) => a - b);
  
  // 表示期間の開始時刻と終了時刻を計算
  const baseDate = dayjs.tz(liftLogs[0].round_created_at, 'UTC').tz('Asia/Tokyo');
  const startTime = baseDate.hour(sortedHours[0]).minute(0).startOf('minute').utc();
  const endTime = baseDate.hour(sortedHours[sortedHours.length - 1] + 1).minute(0).startOf('minute').utc();
  
  // 総セグメント数を計算
  const totalSegments = sortedHours.length * SEGMENTS_PER_HOUR;
  
  const result: LiftSegment[] = [];
  
  // ログを時間順にソート（round_created_atを使用）
  const sortedLogs = [...liftLogs].sort((a, b) => 
    dayjs.tz(a.round_created_at, 'UTC').valueOf() - dayjs.tz(b.round_created_at, 'UTC').valueOf()
  );
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const currentLog = sortedLogs[i];
    const currentTime = dayjs.tz(currentLog.round_created_at, 'UTC');
    
    // 次のログの時刻（なければ終了時刻）
    const nextTime = i < sortedLogs.length - 1 
      ? dayjs.tz(sortedLogs[i + 1].round_created_at, 'UTC')
      : endTime;
    
    // 現在時刻より未来の場合はスキップ
    if (currentTime.isAfter(now)) {
      break;
    }
    
    // ステータスの継続時間を分単位で計算
    const durationMinutes = Math.min(
      nextTime.diff(currentTime, 'minute'),
      endTime.diff(currentTime, 'minute')
    );
    
    // セグメント数に変換（1セグメント = ONE_SEGMENT_MINUTES分）
    const segmentCount = Math.max(1, Math.ceil(durationMinutes / ONE_SEGMENT_MINUTES));
    
    // 現在のセグメントインデックスを計算
    const timeFromStart = currentTime.diff(startTime, 'minute');
    const segmentIndex = Math.floor(timeFromStart / ONE_SEGMENT_MINUTES);
    
    // 時間範囲を計算（サーバーサイドで事前計算）
    const startTimeFormatted = currentTime.tz('Asia/Tokyo').format('HH:mm');
    const endTimeFormatted = nextTime.tz('Asia/Tokyo').subtract(1, 'minute').format('HH:mm');
    const timeRange = `${startTimeFormatted}〜${endTimeFormatted}`;
    
    // 範囲内のセグメントのみ追加
    if (segmentIndex >= 0 && segmentIndex < totalSegments) {
      result.push({
        status: currentLog.status,
        created_at: currentLog.created_at,
        round_created_at: currentLog.round_created_at,
        startIndex: segmentIndex,
        count: Math.min(segmentCount, totalSegments - segmentIndex),
        timeRange
      });
    }
  }
  
  // 時間外セグメントを埋める
  if (result.length === 0 || result[0].startIndex > 0) {
    // 最初のセグメントが時間外の場合
    const outsideStatus: LiftSegment = {
      status: 'outside-hours' as OperationStatus,
      created_at: startTime.toISOString(),
      round_created_at: startTime.toISOString(),
      startIndex: 0,
      count: result.length > 0 ? result[0].startIndex : totalSegments
    };
    result.unshift(outsideStatus);
  }
  
  // 現在時刻以降を時間外で埋める
  const lastSegment = result[result.length - 1];
  const lastEndIndex = lastSegment.startIndex + lastSegment.count;
  if (lastEndIndex < totalSegments) {
    const nowSegmentIndex = Math.floor(now.diff(startTime, 'minute') / ONE_SEGMENT_MINUTES);
    const outsideStartIndex = Math.max(lastEndIndex, nowSegmentIndex);
    
    if (outsideStartIndex < totalSegments) {
      result.push({
        status: 'outside-hours' as OperationStatus,
        created_at: now.toISOString(),
        round_created_at: now.toISOString(),
        startIndex: outsideStartIndex,
        count: totalSegments - outsideStartIndex
      });
    }
  }
  
  return result;
};