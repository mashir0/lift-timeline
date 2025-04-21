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

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPERATING':
      return 'bg-green-200 hover:bg-green-300';
    case 'OPERATION_SLOWED':
      return 'bg-blue-200 hover:bg-blue-300';
    case 'STANDBY':
      return 'bg-yellow-200 hover:bg-yellow-300';
    case 'SUSPENDED':
      return 'bg-gray-200 hover:bg-gray-300';
    case 'OPERATION_TEMPORARILY_SUSPENDED':
      return 'bg-gray-200 hover:bg-gray-300';
    case 'TODAY_CLOSED':
      return 'bg-gray-200 hover:bg-gray-300';
    case 'undefined':
      return 'bg-gray-50 hover:bg-gray-100';
    default:
      return 'bg-gray-200 hover:bg-gray-300';
  }
};

