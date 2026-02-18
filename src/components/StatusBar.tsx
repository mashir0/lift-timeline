'use client';
import { defaultStatusJa, getStatusColor, LIFT_DAY_FINAL_HOUR_JST } from '@/lib/constants';
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

        // ツールチップ用のテキスト作成（最後のセグメントはグラフ終端20:00まで表示）
        const startTime = dayjs.tz(segment.created_at, 'UTC').tz('Asia/Tokyo').format('HH:mm');
        const endTime = nextSegment
          ? dayjs.tz(nextSegment.created_at, 'UTC').tz('Asia/Tokyo').subtract(1, 'minute').format('HH:mm')
          : `${String(LIFT_DAY_FINAL_HOUR_JST).padStart(2, '0')}:00`;
        const tooltipText = `${startTime}〜${endTime}`;

        const isNoData = segment.status === 'no-data';
        // 幅が狭い場合は「no data」は表示せず点線のみ（count が十分なときだけテキスト表示）
        const shouldShowNoDataText = isNoData && segment.count >= 5;

        return (
          // セグメント
          <div
            key={groupIndex}
            className={`${isNoData ? 'bg-transparent' : getStatusColor(segment.status)} flex-1 flex items-center justify-center cursor-pointer relative group`}
            style={{ borderRadius, flex: segment.count }}
          >
            {isNoData ? (
              <>
                <div className="absolute top-1/2 left-0 right-0 h-0 -translate-y-1/2 border-t border-dashed border-gray-400" />
                {shouldShowNoDataText && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 whitespace-nowrap z-[1] bg-white px-1">
                    no data
                  </span>
                )}
              </>
            ) : (
              <>
                {shouldShowText && (
                  <span className="text-center text-xs text-gray-600 truncate px-1">
                    {defaultStatusJa[segment.status as keyof typeof defaultStatusJa]}
                  </span>
                )}
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800/80 text-white text-xs rounded whitespace-nowrap z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none">
                  {tooltipText}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
} 