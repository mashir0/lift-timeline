import React from 'react';
import type { liftStatus } from '@/types';
import { defaultStatusJa, getStatusColor } from '@/lib/constants';
import dayjs from '@/util/dayjs';
import type { Dayjs } from 'dayjs';

type StatusBarProps = {
  // liftId: string;
  liftLogs: liftStatus[];
  currentDate: string;
  availableHours: number[];
  totalSegments: number;
};

const SEGMENTS_PER_HOUR = 4; // 5分単位

// 現在時刻（JST）を取得
const now = dayjs.tz(new Date(), 'Asia/Tokyo');

const formatTime = (hour: number, minute: number) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const isSameDay = (date1: Dayjs, date2: Dayjs): boolean => {
  return date1.isSame(date2, 'day');
};

export function StatusBar({ liftLogs, currentDate, availableHours, totalSegments }: StatusBarProps) {

  // セグメントごとのステータスを取得する関数
  const getStatusForSegment = (hour: number, minute: number) => {
    const targetTime = dayjs.tz(currentDate, 'UTC').tz('Asia/Tokyo')
      .hour(hour)
      .minute(minute)
      .startOf('minute');

    // 対象の時間が現在時刻より未来の場合は、未定義のステータスを返す
    if (targetTime.isAfter(now) || (isSameDay(targetTime, now) && targetTime.isAfter(now))) {
      return { status: 'undefined', created_at: targetTime.toISOString() };
    }

    // 降順（新しい順）でソートそのセグメントで最新のLogを取得し
    const liftLog = liftLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find(log => new Date(log.created_at) <= targetTime.toDate());

    console.log(liftLog,targetTime.toISOString(),hour,minute);
    return liftLog || { status: 'outside-hours', created_at: targetTime.toISOString() };
  };

  // セグメントごとのステータスを取得
  const segments = availableHours.flatMap((hour, _) => 
    Array.from({ length: SEGMENTS_PER_HOUR }, (_, segmentIndex) => 
      getStatusForSegment(hour, segmentIndex * (60 / SEGMENTS_PER_HOUR))
    )
  );

  // 連続する同じステータスをグループ化
  const groups = segments.reduce((acc, status, index) => {
    if (index === 0 || status.status !== segments[index - 1].status) {
      acc.push({ 
        ...status, 
        startIndex: index, 
        count: 1 
      });
    } else {
      acc[acc.length - 1].count += 1;
    }
    return acc;
  }, [] as Array<{ status: string; created_at: string; startIndex: number; count: number }>);

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
        const tooltipText = `${group.status} (${timeRange})`;

        return (
          <div
            key={groupIndex}
            className={`flex-1 ${getStatusColor(group.status)} flex items-center justify-center cursor-pointer relative group`}
            style={{ borderRadius, flex: group.count }}
          >
            {shouldShowText && (
              <span className="text-center text-xs text-gray-600 truncate px-1">
                {defaultStatusJa[group.status as keyof typeof defaultStatusJa]}
              </span>
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