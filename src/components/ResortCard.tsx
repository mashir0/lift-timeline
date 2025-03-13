import React from 'react';
import { Map, Info } from 'lucide-react';
import type { Resort, DailyLiftLogs } from '@/types';
import { toJST, getDateKey } from '@/lib/utils';
import { StatusBar } from './StatusBar';

type ResortCardProps = {
  resort: Resort;
  mode: 'daily' | 'weekly';
  currentDate: Date;
  liftLogs: DailyLiftLogs;
};

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7);
const SEGMENTS_PER_HOUR = 12; // 5分単位

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operating':
      return 'bg-green-200';
    case 'outside-hours':
      return 'bg-blue-200';
    case 'preparing':
    case 'investigating':
    case 'closed':
      return 'bg-red-200';
    case 'undefined':
      return 'bg-gray-50';
    default:
      return 'bg-gray-200';
  }
};

const getTimeSegment = (date: Date): number => {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  return (hour - 7) * SEGMENTS_PER_HOUR + Math.floor(minutes / 5);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

export function ResortCard({ resort, mode, currentDate, liftLogs }: ResortCardProps) {
  // 利用可能な時間帯を取得
  const getAvailableHours = () => {
    const hours = new Set<number>();
    Object.values(liftLogs).forEach(logs => {
      logs.forEach(log => {
        const logTime = new Date(log.created_at);
        hours.add(logTime.getHours());
      });
    });
    return Array.from(hours).sort((a, b) => a - b);
  };

  const availableHours = getAvailableHours();
  const totalSegments = availableHours.length * SEGMENTS_PER_HOUR;
  
  // console.log(liftLogs);
  // console.log(availableHours);

  const getStatusForSegment = (liftId: string, hourIndex: number, segmentIndex: number) => {
    const hour = availableHours[hourIndex];
    const minute = segmentIndex * 5;
    const targetTime = new Date(currentDate);
    targetTime.setHours(hour, minute, 0, 0);

    // 現在時刻（JST）を取得
    const now = toJST(new Date());

    // 対象の時間が現在時刻より未来の場合は、未定義のステータスを返す
    if (
      targetTime > now ||
      (isSameDay(targetTime, now) && targetTime > now)
    ) {
      return { status: 'undefined', status_ja: '未定' };
    }

    // 現在の日付のログを取得（JST）
    const dayLogs = liftLogs[liftId] || [];

    // その時点での最新のステータスを取得（JST）
    const liftLog = dayLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find(log => new Date(log.created_at) <= targetTime);

    return liftLog || { status: 'outside-hours', status_ja: '営業時間外' };
  };
  
  // console.log( resort.name , liftLogs);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{resort.name}</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        {mode === 'daily' ? (
          <div className="min-w-[800px]">
            {/* 時間軸ヘッダー */}
            <div className="grid grid-cols-[150px_1fr] gap-4 mb-2">
              <div className="text-xs text-gray-400">リフト名</div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${availableHours.length}, 1fr)` }}>
                {availableHours.map((hour) => (
                  <div key={hour} className="text-sm text-gray-500 text-left">
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>
            
            {/* リフトごとのタイムライン */}
            <div className="space-y-4">
              {resort.lifts.map((lift) => {
                // セグメントごとのステータスを取得
                const segments = availableHours.flatMap((_, hourIndex) => 
                  Array.from({ length: SEGMENTS_PER_HOUR }, (_, segmentIndex) => 
                    getStatusForSegment(lift.id, hourIndex, segmentIndex)
                  )
                );

                // 連続する同じステータスをグループ化
                const groups = segments.reduce((acc, status, index) => {
                  if (index === 0 || status.status !== segments[index - 1].status) {
                    acc.push({ ...status, startIndex: index, count: 1 });
                  } else {
                    acc[acc.length - 1].count += 1;
                  }
                  return acc;
                }, [] as Array<{ status: string; status_ja: string; startIndex: number; count: number }>);

                return (
                  <div key={lift.id} className="grid grid-cols-[150px_1fr] gap-4">
                    <div className="text-sm text-gray-600 text-left">{lift.name}</div>
                    <div className="relative h-6">
                      <StatusBar
                        groups={groups}
                        totalSegments={totalSegments}
                        availableHours={availableHours}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {resort.lifts.map((lift) => (
              <div key={lift.id} className="space-y-1">
                <div className="text-sm text-gray-600">{lift.name}</div>
                <div className="h-6 grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-green-200 rounded"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <a
          href={resort.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <Map className="w-4 h-4 mr-2" />
          ゲレンデマップを見る
        </a>
        <a
          href={resort.infoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <Info className="w-4 h-4 mr-2" />
          詳しい運行情報を見る
        </a>
      </div>
    </div>
  );
}