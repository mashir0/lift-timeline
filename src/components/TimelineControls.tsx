import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type TimelineControlsProps = {
  mode: 'daily' | 'weekly';
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onModeChange: (mode: 'daily' | 'weekly') => void;
  availableDates: string[];
};

export function TimelineControls({
  mode,
  currentDate,
  onPrevious,
  onNext,
  onToday,
  onModeChange,
  availableDates,
}: TimelineControlsProps) {
  const currentDateStr = currentDate.toISOString().split('T')[0];
  // const todayStr = new Date().toISOString().split('T')[0];
  const todayStr = currentDate.toISOString().split('T')[0];
  
  // 前日の日付文字列を取得
  const previousDate = new Date(currentDate);
  previousDate.setDate(currentDate.getDate() - 1);
  const previousDateStr = previousDate.toISOString().split('T')[0];
  
  // 翌日の日付文字列を取得
  const nextDate = new Date(currentDate);
  nextDate.setDate(currentDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  
  // ボタンの有効/無効を判定
  const canGoPrevious = availableDates.includes(previousDateStr);
  const canGoNext = availableDates.includes(nextDateStr);
  const canGoToday = availableDates.includes(todayStr);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'short'
            })}
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
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onToday}
                disabled={!canGoToday}
                className={`px-4 py-2 rounded-xl ${
                  canGoToday
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
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
                <ChevronRight className="w-5 h-5" />
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