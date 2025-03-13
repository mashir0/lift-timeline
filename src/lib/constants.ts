import { OperationStatus, Resort } from '@/types';

// リゾートリスト
export const defaultStatusJa: Record<OperationStatus, string> = {
  'operating': '運転中',
  'outside-hours': '営業時間外',
  'preparing': '準備中',
  'closed': '運休',
  'investigating': '点検中'
}; 

// リゾートリスト
export const resortList: Resort[] = [
  {
    id: 'resort_01',
    name: '白馬八方尾根スキー場',
    status: 'all-available',
    mapUrl: '#',
    infoUrl: '#',
    lifts: [
      { id: 'lift_01', name: 'ゴンドラライン', },
      { id: 'lift_02', name: 'アダム', },
      { id: 'lift_03', name: 'イブ', },
    ],
  },
  {
    id: 'resort_02',
    name: '白馬岩岳スノーフィールド',
    status: 'partially-available',
    mapUrl: '#',
    infoUrl: '#',
    lifts: [
      { id: 'lift_01', name: 'ゴンドラ', },
      { id: 'lift_02', name: 'みどりパノラマ', },
    ],
  },
];
