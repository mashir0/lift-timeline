import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Dayjs } from 'dayjs';

type TimelineControlsProps = {
  mode: 'daily' | 'weekly';
  today: Dayjs;
  currentDate: Dayjs;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onModeChange: (mode: 'daily' | 'weekly') => void;
};

export function TimelineControls({
  mode,
  today,
  currentDate,
  onToday,
  onPrevious,
  onNext,
  onModeChange,
}: TimelineControlsProps) {
  const sevenDaysAgo = today.subtract(6, 'day').tz('Asia/Tokyo')
  
  // ボタンの有効/無効を判定
  const canGoPrevious = currentDate.tz('Asia/Tokyo').isAfter(sevenDaysAgo)
  const canGoNext = currentDate.tz('Asia/Tokyo').isBefore(today.tz('Asia/Tokyo'))

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.format('YYYY年MM月DD日')}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          {mode === 'daily' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className={`p-2 rounded-xl ${
                  canGoPrevious 
                    ? 'hover:bg-gray-100' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onToday}
                className={`px-4 py-2 rounded-xl`}
              >
                今日 
              </button>
              <button
                onClick={onNext}
                disabled={!canGoNext}
                className={`p-2 rounded-xl ${
                  canGoNext 
                    ? 'hover:bg-gray-100' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="flex rounded-lg border border-gray-200">
            <button
              onClick={() => onModeChange('daily')}
              className={`px-4 py-2 text-sm rounded-l-lg ${
                mode === 'daily'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              日次表示
            </button>
            <button
              onClick={() => onModeChange('weekly')}
              className={`px-4 py-2 text-sm rounded-r-lg ${
                mode === 'weekly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              週次表示
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}