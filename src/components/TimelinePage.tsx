'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { ResortCard } from '@/components/ResortCard';
import { Legend } from '@/components/Legend';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';
import dayjs from '@/util/dayjs';
import type { Dayjs } from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { cp } from 'fs';

type TimelinePageProps = {
  initialResorts: ResortsDto;
  initialLifts: LiftsDto;
  initialLogs: AllResortsLiftLogs;
  todayString: string;
  isLoading?: boolean;
};

export function TimelinePage({ initialResorts, initialLifts, initialLogs, todayString, isLoading: initialIsLoading = false }: TimelinePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [isLoading, setIsLoading] = useState(initialIsLoading);

  const today = dayjs.tz(todayString, 'UTC').tz('Asia/Tokyo');
  const [currentDate, setCurrentDate] = useState<Dayjs>(today);
  const [lastUpdated, setLastUpdated] = useState(today);

  const [allResort] = useState(initialResorts);
  const [allLift] = useState(initialLifts);
  const [liftLogs, setLiftLogs] = useState(initialLogs);

  // initialLogsが変更されたらliftLogsを更新
  useEffect(() => {
    setLiftLogs(initialLogs);
    setIsLoading(false);
  }, [initialLogs]);

  const handleRefresh = () => {
    setLastUpdated(dayjs());
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
        
        {isLoading || !liftLogs || Object.keys(liftLogs).length === 0 ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(liftLogs).map(([resortId, resortLiftLogs]) => {
              const dateKey = currentDate.format('YYYY-MM-DD');
              const dateLiftLogs = resortLiftLogs[dateKey] || {};
            
              return (
                <ResortCard
                  key={resortId}
                  resort={allResort[Number(resortId)]}
                  lifts={allLift[Number(resortId)]}
                  mode={mode}
                  liftLogs={dateLiftLogs}
                />
              );
            })}
          </div>
        )}
        
        <div className="mt-6">
          <Legend mode={mode} />
        </div>
      </main>
    </div>
  );
} 