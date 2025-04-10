import { fetchTable, insertTable } from './supabase';
import { DBLiftStatusJst, ResortLiftLogsByDate, DBResort, DBLiftStatus, YukiyamaResponse, DBLift, ResortsDto, LiftsDto } from '@/types';
import dayjs from '@/util/dayjs';

// Resorts一覧　id: {name, map_url}
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

// Lifts一覧　id: {name, start_time, end_time}
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

// LiftStatus一覧 resort_id: {yyyy-mm-dd: {lift_id: {status, created_at}}}
export async function fetchWeeklyLiftLogs(resortId: number, currentDate: string): Promise<ResortLiftLogsByDate> {
  const fromDate = dayjs.tz(currentDate, 'Asia/Tokyo').toDate();
  const toDate   = dayjs.tz(currentDate, 'Asia/Tokyo').add(1, 'day').toDate();
  
  const data = await fetchTable<DBLiftStatusJst>('lift_status_view', {
    resort_id: resortId,
    created_at: {
      gte: fromDate, // 以上
      lt: toDate // 未満
    }
  });

  if (!data) {
    console.error('Error fetching lift statuses: data is null');
    return {};
  }
  
  // データ集計を完了してから一度だけログを出力
  const sum = data.reduce((acc, log) => {
    const date = acc[log.created_at] || 0;
    acc[log.created_at] = date + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`リゾートID ${resortId} の時間帯別データ件数:`, sum);

  // 日付、リフトIDでグループ化
  const groupedLogs: ResortLiftLogsByDate = {};
  
  data?.forEach((log: DBLiftStatusJst) => {
    // 日付（YYYY-MM-DD）を取得
    const date = log.created_at.split('T')[0];

    // 日付のグループを初期化
    if (!groupedLogs[date]) {
      groupedLogs[date] = {};
    }

    // リフトIDのグループを初期化
    if (!groupedLogs[date][log.lift_id]) {
      groupedLogs[date][log.lift_id] = [];
    }
    
    // ログを追加
    groupedLogs[date][log.lift_id].push({
      status: log.status,
      created_at: log.created_at
    });
  });
  return groupedLogs;
}

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

// フロントエンド側でも静的に使えるように
export const DEFAULT_RESORT_ID = '230'; // スキー場のデフォルトID 