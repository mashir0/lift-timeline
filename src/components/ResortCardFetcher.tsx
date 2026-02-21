'use client';

import { useState, useEffect } from 'react';
import { ResortCard } from './ResortCard';
import { ResortCardSkeleton } from './ResortCardSkeleton';
import {
  fetchResortLiftLogs,
  type FetchResortLiftLogsResult,
} from '@/app/actions/fetchResortLiftLogs';
import type { ResortsDto, LiftsDto } from '@/types';

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
  const [result, setResult] = useState<FetchResortLiftLogsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResult(null);

    const loadData = async () => {
      try {
        const liftIds = Object.keys(lifts).map(Number);
        const res = await fetchResortLiftLogs(Number(resortId), dateStr, liftIds);
        if (cancelled) return;
        setResult(res);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching resort data:', err);
          setResult({ ok: false, reason: 'error', message: '読み込みに失敗しました' });
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
  if (!result) return null;

  if (result.ok === false && result.reason === 'no_data') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{resort.name}</h3>
        <p className="text-sm text-gray-600">リフト情報がありません</p>
      </div>
    );
  }

  if (result.ok === false && result.reason === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{resort.name}</h3>
        <p className="text-sm text-red-600">読み込みに失敗しました: {result.message}</p>
      </div>
    );
  }

  return (
    <ResortCard
      mode={mode}
      dateStr={dateStr}
      resort={resort}
      lifts={lifts}
      liftLogs={result.liftSegments}
      hours={result.hours}
    />
  );
}
