'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { ResortCard } from '@/components/ResortCard';
import { Legend } from '@/components/Legend';
import type { AllResortsLiftLogs } from '@/types';
import { fetchWeeklyLiftLogs } from '@/lib/db';
import { resortList } from '@/lib/constants';

export default function Home() {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  // const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date('2025-03-12');
  const [currentDate, setCurrentDate] = useState(today);
  const [lastUpdated, setLastUpdated] = useState(today);
  const [liftLogs, setLiftLogs] = useState<AllResortsLiftLogs>({});
  const availableDates = Object.keys(
    Object.values(liftLogs).reduce((acc, resortLogs) => {
      Object.keys(resortLogs).forEach(date => {
        acc[date] = true;
      });
      return acc;
    }, {} as Record<string, boolean>)
  );

  useEffect(() => {
    const fetchLogs = async () => {
      const logs: AllResortsLiftLogs = {};
      for (const resort of resortList) {
        const resortLogs = await fetchWeeklyLiftLogs(resort.id);
        logs[resort.id] = resortLogs;
      }
      setLiftLogs(logs);
    };
    fetchLogs();
  }, [lastUpdated]);
  
  // 更新ボタンを押したら、lastUpdatedを更新
  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  // 前の日付を表示
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  // 次の日付を表示
  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // 今日を表示
  const handleToday = () => {
    setCurrentDate(today);
  };
  
  // console.log("liftLogs", liftLogs);

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
          {/* 選択された日付のデータのみを表示 */}
          {resortList.map((resort) => {
            const dateKey = currentDate.toISOString().split('T')[0];
            const resortLiftLogs = liftLogs[resort.id] || {};
            const dateLiftLogs = resortLiftLogs[dateKey] || {};
          
            console.log(resort.id, dateKey);
            console.log(dateLiftLogs)

            return (
              <ResortCard
                key={resort.id}
                resort={resort}
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