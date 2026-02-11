import { OperationStatus } from '@/types';

// 1時間の分割数 
export const SEGMENTS_PER_HOUR = 4; // 1時間の分割数 
export const ONE_SEGMENT_MINUTES = 60 / SEGMENTS_PER_HOUR; // 1セグメントのONE_SET_MINUTES

// R2 キャッシュ（プラン1）
export const LIFT_CACHE_KEY_PREFIX = 'lift-timeline';
export const CACHE_RETENTION_DAYS = 7;
/** その日のリフトログが確定したとみなす JST の時（この時を過ぎたら再計算しない） */
export const LIFT_DAY_FINAL_HOUR_JST = 19;

// リゾートリスト
export const defaultStatusJa: Record<OperationStatus, string> = {
  "OPERATING": "運転中",
  "OPERATION_SLOWED": "低速運転",
  "STANDBY": "待機中",
  "SUSPENDED": "運休",
  "OPERATION_TEMPORARILY_SUSPENDED": "運休中",
  "TODAY_CLOSED": "本日運休",
  "outside-hours": "時間外"
};
const openColorPrimary = 'bg-green-200 hover:bg-green-300';
const openColorSecondary = 'bg-blue-200 hover:bg-blue-300';

const stopColorPrimary = 'bg-gray-400 hover:bg-gray-500 text-white';
const stopColorSecondary = 'bg-gray-100 hover:bg-gray-500';

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

