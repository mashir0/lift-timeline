import { OperationStatus } from '@/types';

// 1時間の分割数 
export const SEGMENTS_PER_HOUR = 4; // 1時間の分割数 
export const ONE_SEGMENT_MINUTES = 60 / SEGMENTS_PER_HOUR; // 1セグメントのONE_SET_MINUTES

// R2 キャッシュ（プラン1）
export const LIFT_CACHE_KEY_PREFIX = 'lift-timeline';
/** キャッシュキーに含めるバージョン（表示範囲・データ構造変更時に上げて無効化） */
export const CACHE_KEY_VERSION = 'v2';
export const CACHE_RETENTION_DAYS = 7;
/** その日のリフトログが確定したとみなす JST の時（この時を過ぎたら再計算しない） */
export const LIFT_DAY_FINAL_HOUR_JST = 20;
/** タイムラインに表示する時間帯の開始時（JST） */
export const DISPLAY_HOUR_START_JST = 7;

/** タイムライン表示用の時間の配列（DISPLAY_HOUR_START_JST〜19時 → グラフ終端は20:00） */
export function getDisplayHours(): number[] {
  const hours: number[] = [];
  for (let h = DISPLAY_HOUR_START_JST; h < LIFT_DAY_FINAL_HOUR_JST; h++) {
    hours.push(h);
  }
  return hours;
}
/**
 * 保持日数・no_data 判定および表示の基準となる「今日」の日付（YYYY-MM-DD）。
 * 未設定なら実時刻の今日。テスト用は NEXT_PUBLIC_REFERENCE_DATE で指定（例: 2024-02-10）。
 */
export const REFERENCE_DATE: string | undefined =
  process.env.NEXT_PUBLIC_REFERENCE_DATE;

// リゾートリスト
export const defaultStatusJa: Record<OperationStatus, string> = {
  "OPERATING": "運行中",
  "OPERATION_SLOWED": "低速運行",
  "STANDBY": "待機中",
  "SUSPENDED": "運休",
  "OPERATION_TEMPORARILY_SUSPENDED": "一時停止",
  "TODAY_CLOSED": "営業時間外",
  "outside-hours": "時間外",
  "no-data": "no data"
};
const openColorPrimary = 'bg-blue-200 hover:bg-blue-500';
const openColorSecondary = 'bg-blue-100 hover:bg-blue-300';

const stopColorPrimary = 'bg-gray-400 hover:bg-gray-500 text-white';
const stopColorSecondary = 'bg-gray-200 hover:bg-gray-500';

export const getStatusColor = (status: string) => {
  switch (status) {
    // 運転中
    case 'OPERATING':
      return openColorPrimary;
    case 'OPERATION_SLOWED':
      return openColorSecondary;

    // 運休中と停止の間
    case 'STANDBY':
      return stopColorSecondary;
    case 'SUSPENDED':
      return stopColorSecondary;
    case 'OPERATION_TEMPORARILY_SUSPENDED':
      return stopColorSecondary;

    // 停止
    case 'TODAY_CLOSED':
      return stopColorPrimary;
    // 未定義
    case 'undefined':
      return stopColorPrimary;
    default:
      return stopColorPrimary;
  }
};

