'use server'
import { fetchOneDayLiftLogs } from './supabaseDto';
import { getCachedResortLogs, setCachedResortLogs } from './cache';
import { measureExecutionTime } from './performance';
import type { OneDayLiftLogs } from '@/types';

export async function getResortLiftLogs(
  resortId: number, 
  date: string
): Promise<OneDayLiftLogs> {
  try {
    // キャッシュから取得を試行
    const cached = await getCachedResortLogs(resortId, date);
    if (cached) {
      return cached;
    }
    
    // キャッシュミスの場合、データベースから取得
    const result = await measureExecutionTime(
      () => fetchOneDayLiftLogs(resortId, date),
      `getResortLiftLogs-${resortId}-${date}`
    );
    
    // 取得したデータをキャッシュに保存
    await setCachedResortLogs(resortId, date, result.result);
    
    // 実行時間の監視
    if (process.env.NODE_ENV === 'development') {
      console.log(`Resort ${resortId} logs fetched in ${result.executionTime.toFixed(2)}ms`);
    }
    
    return result.result;
  } catch (error) {
    console.error(`Error fetching lift logs for resort ${resortId}:`, error);
    return { liftLogs: {}, hours: [] };
  }
} 