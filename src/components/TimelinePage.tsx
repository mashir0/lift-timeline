import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { Legend } from '@/components/Legend';
import { ResortCardStream } from '@/components/ResortCardStream';
import { ResortCardSkeleton } from '@/components/ResortCardSkeleton';
import type { ResortsDto, LiftsDto } from '@/types';

type TimelinePageProps = {
  resortIds: string[];
  resorts: ResortsDto;
  lifts: LiftsDto;
  dateStr: string;
  mode: 'daily' | 'weekly';
  todayStr: string;
  prevUrl: string;
  nextUrl: string;
  todayUrl: string;
  dailyUrl: string;
  weeklyUrl: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  lastUpdated: Date;
};

export function TimelinePage({
  resortIds,
  resorts,
  lifts,
  dateStr,
  mode,
  todayStr,
  prevUrl,
  nextUrl,
  todayUrl,
  dailyUrl,
  weeklyUrl,
  canGoPrevious,
  canGoNext,
  lastUpdated,
}: TimelinePageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header lastUpdated={lastUpdated} />
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <TimelineControls
          mode={mode}
          dateStr={dateStr}
          todayStr={todayStr}
          prevUrl={prevUrl}
          nextUrl={nextUrl}
          todayUrl={todayUrl}
          dailyUrl={dailyUrl}
          weeklyUrl={weeklyUrl}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
        {resortIds.length === 0 ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {resortIds.map((id) => (
              <Suspense
                key={id}
                fallback={<ResortCardSkeleton />}
              >
                <ResortCardStream
                  resortId={id}
                  dateStr={dateStr}
                  mode={mode}
                  resort={resorts[Number(id)]}
                  lifts={lifts[Number(id)]}
                />
              </Suspense>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Legend mode={mode} />
        </div>
      </main>
    </div>
  );
}
