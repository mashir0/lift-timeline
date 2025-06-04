import React, { useState, useCallback, useRef } from 'react';
import { MapIcon } from '@heroicons/react/24/outline';
import type { ResortsDto, LiftsDto, LiftSegmentsByLiftId } from '@/types';
import { StatusBar } from './StatusBar';
// import dayjs from '@/util/dayjs';

type ResortCardProps = {
  mode: 'daily' | 'weekly';
  resort: ResortsDto[number];
  lifts: LiftsDto[number];
  liftLogs: LiftSegmentsByLiftId;
  hours: number[];
};

export function ResortCard({ mode, resort, lifts, liftLogs, hours }: ResortCardProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const showTooltip = useCallback((e: React.MouseEvent<HTMLSpanElement>, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left,
      y: rect.top - 30
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  // liftLogsが存在しない場合は何も表示しない
  if (!liftLogs || !hours) {
    return null;
  }

  const availableHours = hours;

  return (
    <>
      {/* ツールチップ */}
      {tooltip && (
        <div
          className="fixed bg-gray-800/80 text-white text-xs rounded px-2 py-1 pointer-events-none z-[9999]"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 w-full">
        <div className="flex justify-between items-start mb-4 overflow-visible">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{resort.name}</h3>
          </div>
        </div>

        <div className="w-full" ref={timelineRef}>
          {mode === 'daily' ? (
            <div className="w-full">
              {/* レスポンシブな時間軸ヘッダー */}
              <div className="flex flex-col md:grid md:grid-cols-[120px_1fr] mb-2 overflow-visible">
                <div className="text-xs text-gray-400 hidden md:block">リフト名</div>
                <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableHours.length}, 1fr)` }}>
                  {availableHours.map((hour) => (
                    <div key={hour} className="text-sm text-gray-500 text-left">
                      <span className="hidden md:inline">{hour}:00</span>
                      <span className="md:hidden">
                        {availableHours.length <= 6 || hour % 2 === 1 ? `${hour}:00` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* リフトごとのタイムライン */}
              <div className="space-y-4 w-full">
                {Object.entries(liftLogs).map(([liftId, liftSegments]) => ( 
                  <div key={liftId} className="flex flex-col md:grid md:grid-cols-[120px_1fr] w-full"> 
                    <div className="text-sm text-gray-600 truncate mb-0 flex md:items-center items-end">
                      <span className="truncate cursor-help"
                        onMouseEnter={(e) => showTooltip(e, lifts[Number(liftId)].name)}
                        onMouseLeave={hideTooltip}
                      >
                        {lifts[Number(liftId)].name}
                      </span>
                    </div>
                  
                    <div className="relative h-6 w-full">
                      <StatusBar liftSegments={liftSegments} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Weekly
            <div>
              <h1>Weekly T.B.D.</h1>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-4">
          <a
            href={resort.map_url.startsWith('http') ? resort.map_url : `https://${resort.map_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <MapIcon className="w-4 h-4 mr-2" />
            ゲレンデマップを見る
          </a>
          {/* <a
            href={resort.infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Info className="w-4 h-4 mr-2" />
            詳しい運行情報を見る
          </a> */}
        </div>
      </div>
    </>
  );
}