import React from 'react';
import { toJST } from '@/lib/utils';

type StatusBarProps = {
  liftId: string;
  liftLogs: Record<string, Array<{ status: string; status_ja: string; created_at: string }>>;
  currentDate: Date;
  availableHours: number[];
  totalSegments: number;
};

const SEGMENTS_PER_HOUR = 12; // 5分単位

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operating':
      return 'bg-green-200 hover:bg-green-300';
    case 'outside-hours':
      return 'bg-blue-200 hover:bg-blue-300';
    case 'preparing':
    case 'investigating':
    case 'closed':
      return 'bg-red-200 hover:bg-red-300';
    case 'undefined':
      return 'bg-gray-50 hover:bg-gray-100';
    default:
      return 'bg-gray-200 hover:bg-gray-300';
  }
};

const formatTime = (hour: number, minute: number) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

export function StatusBar({ liftId, liftLogs, currentDate, availableHours, totalSegments }: StatusBarProps) {
  // セグメントごとのステータスを取得する関数
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

  // セグメントごとのステータスを取得
  const segments = availableHours.flatMap((_, hourIndex) => 
    Array.from({ length: SEGMENTS_PER_HOUR }, (_, segmentIndex) => 
      getStatusForSegment(liftId, hourIndex, segmentIndex)
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
    <div className="absolute inset-0 flex w-full h-full">
      {groups.map((group, groupIndex, acc) => {
        const previousStatus = groupIndex > 0 ? acc[groupIndex - 1].status : null;
        const nextStatus = groupIndex < acc.length - 1 ? acc[groupIndex + 1].status : null;
        const leftRadius = group.startIndex === 0 || group.status !== previousStatus ? '8px' : '0';
        const rightRadius = (group.startIndex + group.count) === totalSegments || group.status !== nextStatus ? '8px' : '0';
        const borderRadius = `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;
        
        // 幅に応じてテキスト表示を判断（レスポンシブ対応）
        const shouldShowText = group.count >= 5;

        // ツールチップ用の時間範囲を計算
        const startSegmentIndex = group.startIndex;
        const endSegmentIndex = group.startIndex + group.count - 1;
        
        const startHourIndex = Math.floor(startSegmentIndex / SEGMENTS_PER_HOUR);
        const startMinuteIndex = startSegmentIndex % SEGMENTS_PER_HOUR;
        
        const endHourIndex = Math.floor(endSegmentIndex / SEGMENTS_PER_HOUR);
        const endMinuteIndex = endSegmentIndex % SEGMENTS_PER_HOUR;
        
        const startHour = availableHours[startHourIndex];
        const startMinute = startMinuteIndex * 5;
        
        const endHour = availableHours[endHourIndex];
        const endMinute = (endMinuteIndex + 1) * 5 - 1; // 終了時間は次のセグメントの開始時間の1分前

        const timeRange = `${formatTime(startHour, startMinute)}〜${formatTime(endHour, endMinute)}`;
        const tooltipText = `${group.status_ja} (${timeRange})`;

        return (
          <div
            key={groupIndex}
            className={`flex-1 ${getStatusColor(group.status)} flex items-center justify-center cursor-pointer relative group`}
            style={{ borderRadius, flex: group.count }}
          >
            {shouldShowText && (
              <span className="text-center text-xs text-gray-600 truncate px-1">{group.status_ja}</span>
            )}
            
            {/* Tailwind CSSのみを使用したツールチップ */}
            <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800/80 text-white text-xs rounded whitespace-nowrap z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none">
              {tooltipText}
            </div>
          </div>
        );
      })}
    </div>
  );
} 