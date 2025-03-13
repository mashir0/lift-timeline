import React from 'react';

type StatusBarProps = {
  groups: Array<{
    status: string;
    status_ja: string;
    startIndex: number;
    count: number;
  }>;
  totalSegments: number;
  availableHours: number[];
};

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

const formatTime = (hour: number, minute: number) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export function StatusBar({ groups, totalSegments, availableHours }: StatusBarProps) {
  return (
    <div className="absolute inset-0 flex">
      {groups.map((group, groupIndex, acc) => {
        const previousStatus = groupIndex > 0 ? acc[groupIndex - 1].status : null;
        const nextStatus = groupIndex < acc.length - 1 ? acc[groupIndex + 1].status : null;
        const leftRadius = group.startIndex === 0 || group.status !== previousStatus ? '8px' : '0';
        const rightRadius = (group.startIndex + group.count) === totalSegments || group.status !== nextStatus ? '8px' : '0';
        const borderRadius = `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;
        
        // 5文字以上表示できるかどうかを判定（おおよそ1文字あたり5pxと仮定）
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
            className={`flex-1 ${getStatusColor(group.status)} flex items-center justify-center relative z-0 group`}
            style={{ borderRadius, flex: group.count }}
          >
            {shouldShowText && (
              <span className="text-center text-xs text-gray-600">{group.status_ja}</span>
            )}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              {tooltipText}
            </div>
          </div>
        );
      })}
    </div>
  );
} 