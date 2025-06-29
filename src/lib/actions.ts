'use server'
import { fetchResortLiftLogs } from './supabaseDto';
import type { DBLiftStatusView } from '@/types';

export async function getResortLiftLogs(
  resortId: number, 
  date: string
): Promise<DBLiftStatusView[]> {
  try {
    // リゾート単位で一括取得（生データ、処理はクライアント側で実行）
    const logs = await fetchResortLiftLogs(resortId, date);
    
    return logs;
  } catch (error) {
    console.error(`Error fetching resort lift logs for resort ${resortId}:`, error);
    return [];
  }
} 