'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { Legend } from '@/components/Legend';
import type { Dayjs } from 'dayjs';
import dayjs from '@/util/dayjs';
import { useRouter, useSearchParams } from 'next/navigation';

type TimelineInteractiveProps = {
  todayString: string;
  dateStr: string;
  children: React.ReactNode;
};

export function TimelineInteractive({ 
  todayString, 
  dateStr, 
  children 
}: TimelineInteractiveProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');

  const today = dayjs.tz(todayString, 'UTC').tz('Asia/Tokyo');
  const [currentDate, setCurrentDate] = useState<Dayjs>(today);
  const [lastUpdated, setLastUpdated] = useState(today);

  const handleRefresh = () => {
    setLastUpdated(dayjs());
    // ページをリロードしてデータを更新
    window.location.reload();
  };

  const updateDate = (date: Dayjs) => {
    const newDateStr = date.format('YYYY-MM-DD');
    window.location.href = `/?date=${newDateStr}`;
  };

  const handlePrevious = () => {
    const newDate = currentDate.subtract(1, 'day');
    updateDate(newDate);
  };

  const handleNext = () => {
    const newDate = currentDate.add(1, 'day');
    updateDate(newDate);
  };

  const handleToday = () => {
    updateDate(today);
  };

  // URLのクエリパラメータから日付を取得してcurrentDateを更新
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const newDate = dayjs.tz(dateParam, 'UTC').tz('Asia/Tokyo');
      if (newDate.isValid()) {
        setCurrentDate(newDate);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header lastUpdated={lastUpdated.toDate()} onRefresh={handleRefresh} />
      
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <TimelineControls
          mode={mode}
          today={today}
          currentDate={currentDate}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          onModeChange={setMode}
        />
        
        <div className="space-y-4">
          {children}
        </div>
        
        <div className="mt-6">
          <Legend mode={mode} />
        </div>
      </main>
    </div>
  );
} 