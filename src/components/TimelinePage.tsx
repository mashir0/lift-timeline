'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { ResortCard } from '@/components/ResortCard';
import { Legend } from '@/components/Legend';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';
import dayjs from '@/util/dayjs';
import type { Dayjs } from 'dayjs';

type TimelinePageProps = {
  initialResorts: ResortsDto;
  initialLifts: LiftsDto;
  initialLogs: AllResortsLiftLogs;
  todayString: string;
};

export function TimelinePage({ initialResorts, initialLifts, initialLogs, todayString }: TimelinePageProps) {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');

  const today = dayjs.tz(todayString, 'Asia/Tokyo');
  const [currentDate, setCurrentDate] = useState<Dayjs>(today);
  const [lastUpdated, setLastUpdated] = useState(today);

  const [allResort] = useState(initialResorts);
  const [allLift] = useState(initialLifts);
  const [liftLogs] = useState(initialLogs);

  // const availableDates = Object.keys(
  //   Object.values(liftLogs).reduce((acc, resortLogs) => {
  //     Object.keys(resortLogs).forEach(date => {
  //       acc[date] = true;
  //     });
  //     return acc;
  //   }, {} as Record<string, boolean>)
  // );

  const handleRefresh = () => {
    setLastUpdated(dayjs());
  };

  const setNewDate = (date: Dayjs) => {
    setCurrentDate(date);
  };

  const handlePrevious = () => {
    setNewDate(currentDate.subtract(1, 'day'));
  };

  const handleNext = () => {
    setNewDate(currentDate.add(1, 'day'));
  };

  const handleToday = () => {
    setNewDate(today);
  };

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
          {Object.entries(liftLogs).map(([resortId, resortLiftLogs]) => {
            const dateKey = currentDate.format('YYYY-MM-DD');
            const dateLiftLogs = resortLiftLogs[dateKey] || {};
          
            return (
              <ResortCard
                key={resortId}
                resort={allResort[Number(resortId)]}
                lifts={allLift[Number(resortId)]}
                mode={mode}
                currentDate={currentDate.toISOString()}
                liftLogs={dateLiftLogs}
              />
            );
          })}
        </div>
        
        <div className="mt-6">
          <Legend mode={mode} />
        </div>
      </main>
    </div>
  );
} 