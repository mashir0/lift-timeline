'use client';
import { defaultStatusJa, getStatusColor } from '@/lib/constants';
import dayjs from '@/util/dayjs';
import type { LiftSegment } from '@/types';

type StatusBarProps = {
  liftSegments: LiftSegment[];
};

export function StatusBar({ liftSegments }: StatusBarProps) {
  return (
    <div className="absolute inset-0 flex w-full h-full">
      {liftSegments.map((segment, groupIndex, acc) => {
        const prevSegment = groupIndex > 0 ? acc[groupIndex - 1] : null;
        const nextSegment = groupIndex < acc.length - 1 ? acc[groupIndex + 1] : null;

        // セグメントの丸みを計算 
        const leftRadius = segment.startIndex === 0 || segment.status !== prevSegment?.status ? '8px' : '0';
        const rightRadius = liftSegments.length === groupIndex + 1 || segment.status !== nextSegment?.status ? '8px' : '0';
        const borderRadius = `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;
        
        // 幅に応じてテキスト表示を判断（レスポンシブ対応）
        const shouldShowText = segment.count >= 3;

        // ツールチップ用のテキスト作成
        const startTime = dayjs.tz(segment.created_at, 'UTC').tz('Asia/Tokyo').format('HH:mm');
        const endTime = dayjs.tz(nextSegment?.created_at, 'UTC').tz('Asia/Tokyo').subtract(1, 'minute').format('HH:mm');
        const timeRange = `${startTime}〜${endTime}`;
        const tooltipText = `${segment.status} (${timeRange})`;

        return (
          // セグメント 
          <div
            key={groupIndex}
            className={`${getStatusColor(segment.status)} flex-1 flex items-center justify-center cursor-pointer relative group`}
            style={{ borderRadius, flex: segment.count }}
          >
            {/* テキスト表示 */}
            {shouldShowText && (
              <span className="text-center text-xs text-gray-600 truncate px-1">
                {defaultStatusJa[segment.status as keyof typeof defaultStatusJa]}
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