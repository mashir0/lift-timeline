import { OperationStatus } from '@/types';

// リゾートリスト
export const defaultStatusJa: Record<OperationStatus, string> = {
  "OPERATING": "運転中",
  "OPERATION_SLOWED": "低速運転",
  "STANDBY": "待機中",
  "SUSPENDED": "運休",
  "OPERATION_TEMPORARILY_SUSPENDED": "運休中",
  "TODAY_CLOSED": "本日運休"
};
