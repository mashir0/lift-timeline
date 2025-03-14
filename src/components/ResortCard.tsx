import React, { useState, useCallback, useRef } from 'react';
import { Map, Info } from 'lucide-react';
import type { Resort, DailyLiftLogs } from '@/types';
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

export function ResortCard({ resort, mode, currentDate, liftLogs }: ResortCardProps) {
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
                      {hour}:00
                    </div>
                  ))}
                </div>
              </div>
              
              {/* リフトごとのタイムライン */}
              <div className="space-y-4 w-full">
                {resort.lifts.map((lift) => (
                  <div key={lift.id} className="flex flex-col md:grid md:grid-cols-[120px_1fr] w-full">
                    <div className="text-sm text-gray-600 truncate mb-0 flex md:items-center items-end">
                      <span
                        className="truncate cursor-help"
                        onMouseEnter={(e) => showTooltip(e, lift.name)}
                        onMouseLeave={hideTooltip}
                      >
                        {lift.name}
                      </span>
                    </div>
                    <div className="relative h-6 w-full">
                      <StatusBar
                        liftId={lift.id}
                        liftLogs={liftLogs}
                        currentDate={currentDate}
                        availableHours={availableHours}
                        totalSegments={totalSegments}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {resort.lifts.map((lift) => (
                <div key={lift.id} className="space-y-1">
                  <div className="text-sm text-gray-600 truncate">{lift.name}</div>
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

        <div className="flex flex-wrap justify-end gap-2 mt-4">
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
    </>
  );
}