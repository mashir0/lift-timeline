import { Suspense } from 'react';
import { TimelineInteractive } from '@/components/TimelineInteractive';
import { ResortTimeline } from '@/components/ResortTimeline';
import type { ResortsDto, LiftsDto } from '@/types';

type TimelinePageProps = {
  resorts: ResortsDto;
  lifts: LiftsDto;
  todayString: string;
  dateStr: string;
  isLoading?: boolean;
};

export function TimelinePage({ 
  resorts, 
  lifts, 
  todayString, 
  dateStr, 
  isLoading: initialIsLoading = false 
}: TimelinePageProps) {
  return (
    <TimelineInteractive todayString={todayString} dateStr={dateStr}>
      {Object.entries(resorts).map(([resortId, resort]) => (
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
          <ResortTimeline 
            resortId={Number(resortId)}
            resort={resort}
            lifts={lifts[Number(resortId)]}
            mode="daily"
            dateStr={dateStr}
          />
        </Suspense>
      ))}
    </TimelineInteractive>
  );
} 