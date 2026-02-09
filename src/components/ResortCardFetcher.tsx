'use client';

import { useState, useEffect } from 'react';
import { ResortCard } from './ResortCard';
import { ResortCardSkeleton } from './ResortCardSkeleton';
import { fetchResortLiftLogs } from '@/app/actions/fetchResortLiftLogs';
import type { ResortsDto, LiftsDto, LiftSegmentsByLiftId } from '@/types';

type ResortCardFetcherProps = {
  resortId: string;
  dateStr: string;
  mode: 'daily' | 'weekly';
  resort: ResortsDto[number];
  lifts: LiftsDto[number];
};

export function ResortCardFetcher({
  resortId,
  dateStr,
  mode,
  resort,
  lifts,
}: ResortCardFetcherProps) {
  const [data, setData] = useState<{
    liftSegments: LiftSegmentsByLiftId;
    hours: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    const loadData = async () => {
      try {
        const result = await fetchResortLiftLogs(Number(resortId), dateStr);
        if (cancelled) return;
        setData(result);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching resort data:', err);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [resortId, dateStr]);

  if (loading) return <ResortCardSkeleton />;
  if (!data) return null;

  return (
    <ResortCard
      mode={mode}
      resort={resort}
      lifts={lifts}
      liftLogs={data.liftSegments}
      hours={data.hours}
    />
  );
}
