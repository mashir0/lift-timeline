'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { ResortCard } from '@/components/ResortCard';
import { Legend } from '@/components/Legend';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';

type TimelinePageProps = {
  initialResorts: ResortsDto;
  initialLifts: LiftsDto;
  initialLogs: AllResortsLiftLogs;
};

export function TimelinePage({ initialResorts, initialLifts, initialLogs }: TimelinePageProps) {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const today = new Date('2025-03-19');
  const [currentDate, setCurrentDate] = useState(today);
  const [lastUpdated, setLastUpdated] = useState(today);
  const [allResort] = useState(initialResorts);
  const [allLift] = useState(initialLifts);
  const [liftLogs] = useState(initialLogs);

  const availableDates = Object.keys(
    Object.values(liftLogs).reduce((acc, resortLogs) => {
      Object.keys(resortLogs).forEach(date => {
        acc[date] = true;
      });
      return acc;
    }, {} as Record<string, boolean>)
  );

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(today);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header lastUpdated={lastUpdated} onRefresh={handleRefresh} />
      
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <TimelineControls
          mode={mode}
          currentDate={currentDate}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          onModeChange={setMode}
          availableDates={availableDates}
        />
        
        <div className="space-y-4">
          {Object.entries(liftLogs).map(([resortId, resortLiftLogs]) => {
            const dateKey = currentDate.toISOString().split('T')[0];
            const dateLiftLogs = resortLiftLogs[dateKey] || {};
          
            return (
              <ResortCard
                key={resortId}
                resort={allResort[Number(resortId)]}
                lifts={allLift[Number(resortId)]}
                mode={mode}
                currentDate={currentDate}
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