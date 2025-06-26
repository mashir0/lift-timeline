import { fetchTable, insertTable } from './supabase';
import { DBLiftStatusView, OneDayLiftLogs, DBResort, DBLiftStatus, YukiyamaResponse, DBLift, ResortsDto, LiftsDto, liftStatus, LiftSegment, LiftSegmentsByLiftId, OperationStatus } from '@/types';
import dayjs from '@/util/dayjs';
import { ONE_SEGMENT_MINUTES } from './constants';
import PerformanceMonitor from '@/util/performance';

/* ------------------------------------------------------------
 * スキー場一覧の取得
 * ------------------------------------------------------------ */
export async function getAllResorts(): Promise<ResortsDto> {
  const resorts = await fetchTable<DBResort>('ski_resorts');
  return resorts.reduce((acc, resort) => ({
    ...acc,
    [resort.id]: {
      name: resort.name,
      map_url: resort.map_url,
    }
  }), {});
}

/* ------------------------------------------------------------
 * リフト一覧の取得
 * ------------------------------------------------------------ */
export async function getAllLifts(): Promise<LiftsDto> {
  const lifts = await fetchTable<DBLift>('lifts');
  return lifts.reduce((acc, lift) => ({
    ...acc,
    [lift.resort_id]: {
      ...acc[lift.resort_id],
      [lift.id]: {
        name: lift.name,
        start_time: lift.start_time,
        end_time: lift.end_time
      }
    }
  }), {} as LiftsDto);
}

/* ------------------------------------------------------------
 * StatusBarの計算 
 * ------------------------------------------------------------ */
// 時間を1セグメントごとに丸める
const roundMinutes = (dayjs: dayjs.Dayjs): dayjs.Dayjs => {
  const minutes = Math.floor(dayjs.minute() / ONE_SEGMENT_MINUTES) * ONE_SEGMENT_MINUTES;
  return dayjs.minute(minutes).startOf('minute');
}

// // リフトのログからstatus barのどの位置にstatusを表示するかを計算する（改善版）
// const getSegmentsAndGroups = (liftLogs: liftStatus[], availableHours: number[]): LiftSegment[] => {
//   if (liftLogs.length === 0 || availableHours.length === 0) {
//     return [];
//   }

//   const now = dayjs.tz(new Date(), 'UTC');
//   const sortedHours = availableHours.sort((a, b) => a - b);
  
//   // 表示期間の開始時刻と終了時刻を計算
//   const baseDate = dayjs.tz(liftLogs[0].round_created_at, 'UTC').tz('Asia/Tokyo');
//   const startTime = baseDate.hour(sortedHours[0]).minute(0).startOf('minute').utc();
//   const endTime = baseDate.hour(sortedHours[sortedHours.length - 1] + 1).minute(0).startOf('minute').utc();
  
//   // 総セグメント数を計算
//   const totalSegments = sortedHours.length * SEGMENTS_PER_HOUR;
  
//   const result: LiftSegment[] = [];
  
//   // ログを時間順にソート（round_created_atを使用）
//   const sortedLogs = [...liftLogs].sort((a, b) => 
//     dayjs.tz(a.round_created_at, 'UTC').valueOf() - dayjs.tz(b.round_created_at, 'UTC').valueOf()
//   );
  
//   for (let i = 0; i < sortedLogs.length; i++) {
//     const currentLog = sortedLogs[i];
//     const currentTime = dayjs.tz(currentLog.round_created_at, 'UTC');
    
//     // 次のログの時刻（なければ終了時刻）
//     const nextTime = i < sortedLogs.length - 1 
//       ? dayjs.tz(sortedLogs[i + 1].round_created_at, 'UTC')
//       : endTime;
    
//     // 現在時刻より未来の場合はスキップ
//     if (currentTime.isAfter(now)) {
//       break;
//     }
    
//     // ステータスの継続時間を分単位で計算
//     const durationMinutes = Math.min(
//       nextTime.diff(currentTime, 'minute'),
//       endTime.diff(currentTime, 'minute')
//     );
    
//     // セグメント数に変換（1セグメント = ONE_SEGMENT_MINUTES分）
//     const segmentCount = Math.max(1, Math.ceil(durationMinutes / ONE_SEGMENT_MINUTES));
    
//     // 現在のセグメントインデックスを計算
//     const timeFromStart = currentTime.diff(startTime, 'minute');
//     const segmentIndex = Math.floor(timeFromStart / ONE_SEGMENT_MINUTES);
    
//     // 範囲内のセグメントのみ追加
//     if (segmentIndex >= 0 && segmentIndex < totalSegments) {
//       result.push({
//         status: currentLog.status,
//         created_at: currentLog.created_at,
//         round_created_at: currentLog.round_created_at,
//         startIndex: segmentIndex,
//         count: Math.min(segmentCount, totalSegments - segmentIndex)
//       });
//     }
//   }
  
//   // 時間外セグメントを埋める
//   if (result.length === 0 || result[0].startIndex > 0) {
//     // 最初のセグメントが時間外の場合
//     const outsideStatus: LiftSegment = {
//       status: 'outside-hours' as OperationStatus,
//       created_at: startTime.toISOString(),
//       round_created_at: startTime.toISOString(),
//       startIndex: 0,
//       count: result.length > 0 ? result[0].startIndex : totalSegments
//     };
//     result.unshift(outsideStatus);
//   }
  
//   // 現在時刻以降を時間外で埋める
//   const lastSegment = result[result.length - 1];
//   const lastEndIndex = lastSegment.startIndex + lastSegment.count;
//   if (lastEndIndex < totalSegments) {
//     const nowSegmentIndex = Math.floor(now.diff(startTime, 'minute') / ONE_SEGMENT_MINUTES);
//     const outsideStartIndex = Math.max(lastEndIndex, nowSegmentIndex);
    
//     if (outsideStartIndex < totalSegments) {
//       result.push({
//         status: 'outside-hours' as OperationStatus,
//         created_at: now.toISOString(),
//         round_created_at: now.toISOString(),
//         startIndex: outsideStartIndex,
//         count: totalSegments - outsideStartIndex
//       });
//     }
//   }
  
//   return result;
// };

// LiftStatus一覧 resort_id: {yyyy-mm-dd: {lift_id: {status, created_at}}}
export async function fetchOneDayLiftLogs(
  resortId: number, 
  currentDate: string
): Promise<OneDayLiftLogs> {

  const startTime = Date.now();
  console.log(`🚀 [fetchOneDayLiftLogs] 開始:`, {
    resortId,
    currentDate,
    timestamp: new Date().toISOString()
  });

  PerformanceMonitor.start('fetch-one-day-lift-logs');
  
  const fromDate = dayjs.tz(currentDate, 'Asia/Tokyo').toDate();
  const toDate = dayjs.tz(currentDate, 'Asia/Tokyo').add(1, 'day').toDate();
  
  console.log(`📅 [fetchOneDayLiftLogs] 日付処理完了:`, {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    duration: Date.now() - startTime,
    unit: 'ms'
  });
  
  // ✅ インデックスを活用した軽量クエリ
  console.log(`🔄 [fetchOneDayLiftLogs] データベースクエリ開始`);
  const queryStart = Date.now();
  
  const data = await fetchTable<DBLiftStatusView>('lift_status_view', {
    resort_id: resortId,
    created_at: { gte: fromDate, lt: toDate } 
  });
  
  console.log(`✅ [fetchOneDayLiftLogs] データベースクエリ完了:`, {
    dataSize: data?.length || 0,
    duration: Date.now() - queryStart,
    unit: 'ms'
  });

  if (!data) {
    console.error('❌ [fetchOneDayLiftLogs] Error fetching lift statuses: data is null');
    return { liftLogs: {}, hours: [] };
  }

  // ✅ 軽量なデータ変換
  console.log(`🔄 [fetchOneDayLiftLogs] データ処理開始`);
  const processStart = Date.now();
  const resortLiftLogs: { [liftId: number]: liftStatus[] } = {};
  const hours = new Set<number>();
  
  // liftIdごとにログをまとめる（軽量処理）
  for (const log of data) {
    const hour = dayjs.tz(log.created_at, 'UTC').tz('Asia/Tokyo').hour();
    hours.add(hour);
    
    if (!resortLiftLogs[log.lift_id]) {
      resortLiftLogs[log.lift_id] = [];
    }
    
    // 型変換: DBLiftStatusView → liftStatus
    const roundCreatedAt = roundMinutes(dayjs.tz(log.created_at, 'UTC')).toISOString();
    resortLiftLogs[log.lift_id].push({
      status: log.status,
      created_at: log.created_at,
      round_created_at: roundCreatedAt,
    });
  }
  
  // 各リフトのログを時間順にソート（軽量処理）
  for (const liftId in resortLiftLogs) {
    resortLiftLogs[liftId].sort((a, b) => 
      dayjs.tz(a.created_at, 'UTC').valueOf() - dayjs.tz(b.created_at, 'UTC').valueOf()
    );
  }
  
  console.log(`✅ [fetchOneDayLiftLogs] データ処理完了:`, {
    liftCount: Object.keys(resortLiftLogs).length,
    duration: Date.now() - processStart,
    unit: 'ms'
  });

  // 2. 時間配列をソート
  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  
  console.log(`🎉 [fetchOneDayLiftLogs] 全処理完了:`, {
    totalDuration: Date.now() - startTime,
    unit: 'ms',
    liftCount: Object.keys(resortLiftLogs).length,
    hourCount: sortedHours.length
  });

  PerformanceMonitor.end('fetch-one-day-lift-logs');
  
  return {
    liftLogs: resortLiftLogs,
    hours: sortedHours
  };
}

/* ------------------------------------------------------------
 * リフトのステータスを保存する
 * ------------------------------------------------------------ */
export async function saveLiftStatus(apiResponse: YukiyamaResponse[]): Promise<void> {
  await insertTable<DBLiftStatus>('lift_status', 
    apiResponse.map((res) => ({
      lift_id: res.id,
      comment: res.comment,
      status: res.status,
      groomed: res.groomed,
      status_updated: new Date(res.updateDate),
    }))
  );
}
