import dayjs from '@/util/dayjs';
import type { liftStatus, DBLiftStatusView } from '@/types';
import { ONE_SEGMENT_MINUTES } from './constants';

// 時間を1セグメントごとに丸める（既存の関数を再利用）
const roundMinutes = (dayjs: dayjs.Dayjs): dayjs.Dayjs => {
  const minutes = Math.floor(dayjs.minute() / ONE_SEGMENT_MINUTES) * ONE_SEGMENT_MINUTES;
  return dayjs.minute(minutes).startOf('minute');
};

// ✅ 推奨: 重複レコード削除関数（1リフト処理）
export function removeDuplicateLiftLogs(
  liftLogs: DBLiftStatusView[]
): liftStatus[] {
  if (liftLogs.length === 0) {
    return [];
  }
  
  const processedLogs: liftStatus[] = [];
  let lastStatus: liftStatus | undefined;
  
  // 時間順にソート（既存のロジックをそのまま使用）
  const sortedLogs = [...liftLogs].sort((a, b) => 
    dayjs.tz(a.created_at, 'UTC').valueOf() - dayjs.tz(b.created_at, 'UTC').valueOf()
  );
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    const roundCreatedAt = roundMinutes(dayjs.tz(log.created_at, 'UTC')).toISOString();
    
    // 同じ時間のログがある場合は、1つ前のログを削除（既存ロジック）
    if (lastStatus?.round_created_at === roundCreatedAt) {
      processedLogs.pop();
      lastStatus = processedLogs.at(-1);
    }
    
    // 連続する同じステータスは無視（最後のログは必ず追加）（既存ロジック）
    const isLastLogForThisLift = i === sortedLogs.length - 1;
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
  
  return processedLogs;
}

// 将来的にサーバーアクションとして実行可能な形式
export async function processLiftLogs(
  liftLogs: DBLiftStatusView[]
): Promise<liftStatus[]> {
  return removeDuplicateLiftLogs(liftLogs);
} 