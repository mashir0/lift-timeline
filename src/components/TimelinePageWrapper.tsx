// components/TimelinePageWrapper.tsx
'use client'

import { TimelinePage } from '@/components/TimelinePage';
import type { AllResortsLiftLogs, ResortsDto, LiftsDto } from '@/types';

type TimelinePageWrapperProps = {
  resortsData: ResortsDto;
  liftsData: LiftsDto;
  logsData: AllResortsLiftLogs;
}

export default function TimelinePageWrapper({ 
  resortsData, 
  liftsData, 
  logsData 
}: TimelinePageWrapperProps) {
  return (
    <TimelinePage 
      initialResorts={resortsData} 
      initialLifts={liftsData} 
      initialLogs={logsData} 
    />
  );
}