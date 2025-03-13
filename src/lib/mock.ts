import { OperationStatus, LiftStatusResponse } from '@/types';
import { defaultStatusJa } from '@/lib/constants';

const MOCK_RESORTS = [
  {
    id: 'resort1',
    lifts: [
      { id: 'lift1', name: 'ゴンドラ' },
      { id: 'lift2', name: 'センターフォー' },
      { id: 'lift3', name: 'アルペンクワッド' }
    ]
  }
];

const isWithinOperatingHours = (timestamp: Date): boolean => {
  const hour = timestamp.getHours();
  // return hour >= 8 && hour < 17;
  return true;
};

const getRandomStatus = (previousStatus: OperationStatus | undefined, timestamp: Date): OperationStatus => {
  // 営業時間外の場合は必ずoutside-hoursを返す
  if (!isWithinOperatingHours(timestamp)) {
    return 'outside-hours';
  }

  const statuses: OperationStatus[] = ['operating', 'preparing', 'closed', 'investigating'];
  
  // 前回のステータスがある場合、70%の確率で同じステータスを返す
  if (previousStatus && previousStatus !== 'outside-hours' && Math.random() < 0.7) {
    return previousStatus;
  }

  // 残りの30%の確率で、前回と異なるステータスをランダムに選択
  const availableStatuses = previousStatus 
    ? statuses.filter(status => status !== previousStatus)
    : statuses;
  
  const randomIndex = Math.floor(Math.random() * availableStatuses.length);
  return availableStatuses[randomIndex];
};

// 前回のステータスを保持するためのメモリ内キャッシュ
const statusCache: Record<string, OperationStatus> = {};

export const fetchMockLiftStatuses = async (): Promise<LiftStatusResponse[]> => {
  // 実際のAPIコールをシミュレート
  await new Promise(resolve => setTimeout(resolve, 500));

  const now = new Date();
  const responses: LiftStatusResponse[] = [];

  MOCK_RESORTS.forEach(resort => {
    resort.lifts.forEach(lift => {
      const cacheKey = `${resort.id}-${lift.id}`;
      const previousStatus = statusCache[cacheKey];
      const status = getRandomStatus(previousStatus, now);
      
      // 新しいステータスをキャッシュに保存
      statusCache[cacheKey] = status;

      responses.push({
        resortId: resort.id,
        liftId: lift.id,
        timestamp: now.toISOString(),
        status,
        statusJa: defaultStatusJa[status]
      });
    });
  });

  return responses;
}; 