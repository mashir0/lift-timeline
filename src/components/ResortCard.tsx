'use client';
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { MapIcon } from '@heroicons/react/24/outline';
import dayjs from '@/util/dayjs';
import type { ResortsDto, LiftsDto, LiftSegmentsByLiftId } from '@/types';
import { StatusBar } from './StatusBar';
import { DISPLAY_HOUR_START_JST, LIFT_DAY_FINAL_HOUR_JST, SEGMENTS_PER_HOUR } from '@/lib/constants';

type ResortCardProps = {
  mode: 'daily' | 'weekly';
  dateStr: string;
  resort: ResortsDto[number];
  lifts: LiftsDto[number];
  liftLogs: LiftSegmentsByLiftId;
  hours: number[];
};

export function ResortCard({ mode, dateStr, resort, lifts, liftLogs, hours }: ResortCardProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalSegments = (LIFT_DAY_FINAL_HOUR_JST - DISPLAY_HOUR_START_JST) * SEGMENTS_PER_HOUR;
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (mode !== 'daily' || !dateStr) return;
    const todayStr = dayjs.tz(new Date(), 'Asia/Tokyo').format('YYYY-MM-DD');
    if (dateStr !== todayStr) return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [mode, dateStr]);

  const nowPositionPercent = useMemo(() => {
    if (mode !== 'daily' || !dateStr || hours.length === 0) return null;
    const todayStr = dayjs.tz(new Date(nowTick), 'Asia/Tokyo').format('YYYY-MM-DD');
    if (dateStr !== todayStr) return null;
    const nowJst = dayjs.tz(new Date(nowTick), 'Asia/Tokyo');
    const hour = nowJst.hour();
    const minute = nowJst.minute();
    if (hour < DISPLAY_HOUR_START_JST) return 0;
    if (hour >= LIFT_DAY_FINAL_HOUR_JST) return 100;
    const segmentIndex =
      (hour - DISPLAY_HOUR_START_JST) * SEGMENTS_PER_HOUR +
      Math.floor(minute / (60 / SEGMENTS_PER_HOUR));
    return Math.min(100, (segmentIndex / totalSegments) * 100);
  }, [mode, dateStr, hours.length, totalSegments, nowTick]);
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

  if (!lifts || Object.keys(lifts).length === 0) {
    return null;
  }

  const availableHours = hours ?? [];
  const hasAnyData = availableHours.length > 0;
  const liftEntries = Object.entries(lifts).sort(([a], [b]) => Number(a) - Number(b));

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

        <div className="w-full min-w-0 overflow-x-hidden" ref={timelineRef}>
          {mode === 'daily' ? (
            <div className="w-full min-w-0">
              {hasAnyData && (
                <>
                  {/* レスポンシブな時間軸ヘッダー */}
                  <div className="flex flex-col md:grid md:grid-cols-[120px_1fr] mb-2 overflow-visible min-w-0">
                    <div className="text-xs text-gray-400 hidden md:block">リフト名</div>
                    <div className="grid w-full min-w-0" style={{ gridTemplateColumns: `repeat(${availableHours.length}, 1fr)` }}>
                      {availableHours.map((hour) => {
                        const isLastHour = hour === availableHours[availableHours.length - 1];
                        const showOnMobile =
                          availableHours.length <= 6 || hour % 2 === 1 || isLastHour;
                        return (
                          <div key={hour} className="text-sm text-gray-500 text-left">
                            <span className="hidden md:inline">{hour}:00</span>
                            <span className="md:hidden">
                              {showOnMobile ? `${hour}:00` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* リフトごとのタイムライン（全リフトを列挙し、データがないリフトは「データがありません」を表示） */}
              <div className="space-y-4 w-full">
                {liftEntries.map(([liftId, liftInfo]) => {
                  const segments = liftLogs?.[Number(liftId)];
                  const hasData = segments && segments.length > 0;
                  return (
                    <div key={liftId} className="flex flex-col md:grid md:grid-cols-[120px_1fr] w-full min-w-0">
                      <div className="text-sm text-gray-600 truncate mb-0 flex md:items-center items-end">
                        <span
                          className="truncate cursor-help"
                          onMouseEnter={(e) => showTooltip(e, liftInfo.name)}
                          onMouseLeave={hideTooltip}
                        >
                          {liftInfo.name}
                        </span>
                      </div>

                      {hasData ? (
                        <div className="relative h-6 w-full min-w-0">
                          <StatusBar liftSegments={segments} />
                          {nowPositionPercent != null && (
                            <div
                              className="absolute inset-y-0 w-0.5 bg-red-500 pointer-events-none z-10"
                              style={{ left: `${nowPositionPercent}%` }}
                              aria-hidden
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center h-6 w-full text-sm text-gray-500">
                          データがありません
                        </div>
                      )}
                    </div>
                  );
                })}
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