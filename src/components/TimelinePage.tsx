'use client';
import { useState, useEffect, Suspense } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { ResortCard } from '@/components/ResortCard';
import { Legend } from '@/components/Legend';
import type { ResortsDto, LiftsDto, OneDayLiftLogs, LiftSegmentsByLiftId } from '@/types';
import dayjs from '@/util/dayjs';
import type { Dayjs } from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';

type TimelinePageProps = {
  resorts: ResortsDto;
  lifts: LiftsDto;
  logs: { [resortId: number]: OneDayLiftLogs };
  todayString: string;
  isLoading?: boolean;
};

export function TimelinePage({ resorts, lifts, logs, todayString, isLoading: initialIsLoading = false }: TimelinePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [isLoading, setIsLoading] = useState(initialIsLoading);

  const today = dayjs.tz(todayString, 'UTC').tz('Asia/Tokyo');
  const [currentDate, setCurrentDate] = useState<Dayjs>(today);
  const [lastUpdated, setLastUpdated] = useState(today);

  const [allResort] = useState(resorts);
  const [allLift] = useState(lifts);
  const [liftLogs, setLiftLogs] = useState(logs);

  // initialLogsが変更されたらliftLogsを更新
  useEffect(() => {
    setLiftLogs(logs);
    setIsLoading(false);
  }, [logs]);

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
              // const processedLiftLogs = getSegmentsAndGroups(resortLiftLogs.liftLogs[Number(resortId)], resortLiftLogs.hours);
              const liftSegments: LiftSegmentsByLiftId = {};
              
              for (const [liftId, liftLogs] of Object.entries(resortLiftLogs.liftLogs)) {
                liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, resortLiftLogs.hours);
              }
          
              return (
                <Suspense
                  key={resortId}
                  fallback={
                    <div className="animate-pulse bg-white rounded-lg shadow p-4 h-32">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  }
                >
                  <ResortCard
                    resort={allResort[Number(resortId)]}
                    lifts={allLift[Number(resortId)]}
                    mode={mode}
                    liftLogs={liftSegments}
                    hours={resortLiftLogs.hours}
                  />
                </Suspense>
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