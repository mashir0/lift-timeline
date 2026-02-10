'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import dayjs from '@/util/dayjs';

type TimelineControlsProps = {
  mode: 'daily' | 'weekly';
  dateStr: string;
  todayStr: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onDateChange: (newDate: string) => void;
  onModeChange: (newMode: 'daily' | 'weekly') => void;
};

export function TimelineControls({
  mode,
  dateStr,
  todayStr,
  canGoPrevious,
  canGoNext,
  onDateChange,
  onModeChange,
}: TimelineControlsProps) {
  const currentDate = dayjs.tz(dateStr, 'UTC').tz('Asia/Tokyo');

  const handlePrevious = () => {
    const prevDate = currentDate.subtract(1, 'day').format('YYYY-MM-DD');
    onDateChange(prevDate);
  };

  const handleNext = () => {
    const nextDate = currentDate.add(1, 'day').format('YYYY-MM-DD');
    onDateChange(nextDate);
  };

  const handleToday = () => {
    onDateChange(todayStr);
  };

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
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 rounded-xl hover:bg-gray-100"
              >
                今日
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex rounded-lg border border-gray-200">
            <button
              onClick={() => onModeChange('daily')}
              className={`px-4 py-2 text-sm rounded-l-lg ${mode === 'daily'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
                }`}
            >
              日次表示
            </button>
            <button
              onClick={() => onModeChange('weekly')}
              className={`px-4 py-2 text-sm rounded-r-lg ${mode === 'weekly'
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
