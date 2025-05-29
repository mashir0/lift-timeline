import { fetchTable, insertTable } from './supabase';
import { DBLiftStatusView, OneDayLiftLogs, DBResort, DBLiftStatus, YukiyamaResponse, DBLift, ResortsDto, LiftsDto, liftStatus, LiftSegment, LiftSegmentsByLiftId, OperationStatus } from '@/types';
import dayjs from '@/util/dayjs';
import { SEGMENTS_PER_HOUR, ONE_SEGMENT_MINUTES } from './constants';
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

// リフトのログからstatus barのどの位置にstatusを表示するかを計算する（改善版）
const getSegmentsAndGroups = (liftLogs: liftStatus[], availableHours: number[]): LiftSegment[] => {
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
    
    // 範囲内のセグメントのみ追加
    if (segmentIndex >= 0 && segmentIndex < totalSegments) {
      result.push({
        status: currentLog.status,
        created_at: currentLog.created_at,
        round_created_at: currentLog.round_created_at,
        startIndex: segmentIndex,
        count: Math.min(segmentCount, totalSegments - segmentIndex)
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

// LiftStatus一覧 resort_id: {yyyy-mm-dd: {lift_id: {status, created_at}}}
export async function fetchOneDayLiftLogs(
  resortId: number, 
  currentDate: string
): Promise<LiftSegmentsByLiftId> {
  PerformanceMonitor.start('fetch-one-day-lift-logs');
  
  const fromDate = dayjs.tz(currentDate, 'Asia/Tokyo').toDate();
  const toDate = dayjs.tz(currentDate, 'Asia/Tokyo').add(1, 'day').toDate();
  
  // リフト運行ログデータ取得（全リゾートのデータを一度に取得）
  const data = await fetchTable<DBLiftStatusView>('lift_status_view', {
    resort_id: resortId,
    created_at: { gte: fromDate, lt: toDate } 
  });

  if (!data) {
    console.error('Error fetching lift statuses: data is null');
    return { liftSegments: {}, hours: [] };
  }

  // 1. メモリ効率を改善：Mapを使用してデータを整理
  const resortLiftLogs = new Map<number, DBLiftStatusView[]>();
  const hours = new Set<number>();
  
  // データを一度のループで整理（filterを削除）
  for (const log of data) {
    const hour = dayjs.tz(log.created_at, 'UTC').tz('Asia/Tokyo').hour();
    hours.add(hour);
    
    const liftLogs = resortLiftLogs.get(log.lift_id) || [];
    liftLogs.push(log);
    resortLiftLogs.set(log.lift_id, liftLogs);
  }
  
  // 2. 各リフトのログを時間順にソートし、重複除去と連続ステータス処理
  const logsByLiftId = new Map<number, liftStatus[]>();
  
  for (const [liftId, liftLogs] of resortLiftLogs) {
    // 時間順にソート
    liftLogs.sort((a, b) => 
      dayjs.tz(a.created_at, 'UTC').valueOf() - dayjs.tz(b.created_at, 'UTC').valueOf()
    );
    
    const processedLogs: liftStatus[] = [];
    let lastStatus: liftStatus | undefined;
    
    for (let i = 0; i < liftLogs.length; i++) {
      const log = liftLogs[i];
      const roundCreatedAt = roundMinutes(dayjs.tz(log.created_at, 'UTC')).toISOString();
      
      // 同じ時間のログがある場合は、1つ前のログを削除
      if (lastStatus?.round_created_at === roundCreatedAt) {
        processedLogs.pop();
        lastStatus = processedLogs.at(-1);
      }
      
      // 連続する同じステータスは無視（最後のログは必ず追加）
      const isLastLogForThisLift = i === liftLogs.length - 1;
      if (!lastStatus || lastStatus.status !== log.status || isLastLogForThisLift) {
        const newStatus = {
          status: log.status,
          created_at: log.created_at,
          round_created_at: roundCreatedAt,
        };
        processedLogs.push(newStatus);
        lastStatus = newStatus;
      }
    }
    logsByLiftId.set(liftId, processedLogs);
  }

  // 3. セグメントとグループの計算を最適化
  const liftSegments: { [liftId: number]: LiftSegment[] } = {};
  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  
  for (const [liftId, liftLogs] of logsByLiftId) {
    liftSegments[liftId] = getSegmentsAndGroups(liftLogs, sortedHours);
  }

  const metrics = PerformanceMonitor.end('fetch-one-day-lift-logs');
  console.log('fetchOneDayLiftLogs パフォーマンス:', {
    duration: metrics.duration,
    dataSize: data.length,
    resortDataSize: data.length
  });

  return { liftSegments, hours: sortedHours };
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
