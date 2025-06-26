'use client';
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Dayjs } from 'dayjs';
import dayjs from '@/util/dayjs';

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
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="前の日"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          今日
        </button>
        
        <button
          onClick={onNext}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="次の日"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
        
        <span className="text-lg font-semibold text-gray-900 ml-2">
          {currentDate.format('YYYY年M月D日')}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onModeChange('daily')}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          日別
        </button>
        <button
          onClick={() => onModeChange('weekly')}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          週別
        </button>
      </div>
    </div>
  );
}