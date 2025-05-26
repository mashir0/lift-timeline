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

// リフトのログからstatus barのどの位置にstatusを表示するかを計算する
const getSegmentsAndGroups = (liftLogs: liftStatus[], availableHours: number[]): LiftSegment[] => {
  const now = dayjs.tz(new Date(), 'UTC');
  const segments = availableHours.flatMap(hour => 
    Array.from({ length: SEGMENTS_PER_HOUR }, (_, segmentIndex) => {
      const targetTime = dayjs.tz(liftLogs[0].created_at, 'UTC').tz('Asia/Tokyo')
        .hour(hour)
        .minute(segmentIndex * ONE_SEGMENT_MINUTES)
        .startOf('minute')
        .utc();
        
      const outside: liftStatus = {
        status: 'outside-hours' as OperationStatus, 
        created_at: targetTime.toISOString(), 
        round_created_at: targetTime.toISOString()
      }

      if (targetTime.isAfter(now)) {
        return outside;
      }

      // targetTimeより後ろの時間の最初のlogを取得
      return liftLogs.find( log => dayjs.tz(log.created_at, 'UTC').isAfter(targetTime)) || outside;
    })
  );

  return segments.reduce((acc, status, index) => {
    if (index === 0 || status.status !== segments[index - 1].status) {
      acc.push({ ...status, startIndex: index, count: 1 });
    } else {
      acc[acc.length - 1].count++;
    }
    return acc;
  }, [] as LiftSegment[]);
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
    // resort_id: resortId,
    created_at: { gte: fromDate, lt: toDate } 
  });

  if (!data) {
    console.error('Error fetching lift statuses: data is null');
    return { liftSegments: {}, hours: [] };
  }

  // 1. 最初のフィルタリングで必要なデータのみを抽出
  const resortData = data.filter(log => log.resort_id === resortId);
  
  // 2. 時間帯の抽出を最適化（Setを使用）
  const hours = new Set<number>();
  
  // 3. データ構造を一度のループで構築
  const logsByLiftId = resortData.reduce((acc, log) => {
    // 時間帯を追加
    hours.add(dayjs.tz(log.created_at, 'UTC').tz('Asia/Tokyo').hour());
    
    // リフトIDのグループを初期化（必要な場合のみ）
    if (!acc[log.lift_id]) {
      acc[log.lift_id] = [];
    }
    
    // 重複チェックを最適化
    const lastStatus = acc[log.lift_id].at(-1);
    const roundCreatedAt = roundMinutes(dayjs.tz(log.created_at, 'UTC')).toISOString();
    
    // 同じ時間のログがある場合は、1つ前のログを削除
    if (lastStatus?.round_created_at === roundCreatedAt) {
      acc[log.lift_id].pop();
    }
    
    // 連続する同じステータスは無視（最後のログは必ず追加）
    if (!lastStatus || lastStatus.status !== log.status || log === resortData[resortData.length - 1]) {
      acc[log.lift_id].push({
        status: log.status,
        created_at: log.created_at,
        round_created_at: roundCreatedAt,
      });
    }
    
    return acc;
  }, {} as { [liftId: number]: liftStatus[] });

  // 4. セグメントとグループの計算を最適化
  const liftSegments = Object.entries(logsByLiftId).reduce((acc, [liftId, liftLogs]) => {
    acc[Number(liftId)] = getSegmentsAndGroups(liftLogs, Array.from(hours).sort((a, b) => a - b));
    return acc;
  }, {} as { [liftId: number]: LiftSegment[] });

  const metrics = PerformanceMonitor.end('fetch-one-day-lift-logs');
  console.log('fetchOneDayLiftLogs パフォーマンス:', {
    duration: metrics.duration,
    dataSize: data.length,
    resortDataSize: resortData.length
  });

  return { liftSegments, hours: Array.from(hours).sort((a, b) => a - b) };
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
