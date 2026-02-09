'use client';

import { useState, useEffect } from 'react';
import { ResortCard } from './ResortCard';
import { ResortCardSkeleton } from './ResortCardSkeleton';
import { createClient } from '@/lib/supabase/client';
import { getSegmentsAndGroups } from '@/lib/getSegmentsAndGroups';
import dayjs from '@/util/dayjs';
import type { ResortsDto, LiftsDto, LiftSegmentsByLiftId, liftStatus } from '@/types';

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

    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // 日付の範囲を計算（その日の00:00〜23:59）
        const startDate = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
        const endDate = startDate.endOf('day');

        const { data: liftLogsData, error } = await supabase
          .from('lift_status_view')
          .select('*')
          .eq('resort_id', Number(resortId))
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
          .order('created_at', { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error('Error fetching lift logs:', error);
          setData(null);
          setLoading(false);
          return;
        }

        if (!liftLogsData || liftLogsData.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        // データをリフトIDごとにグループ化
        const groupedByLift: { [liftId: number]: liftStatus[] } = {};
        const hoursSet = new Set<number>();

        liftLogsData.forEach((log: any) => {
          const liftId = log.lift_id;
          const createdAt = dayjs.tz(log.created_at, 'UTC').tz('Asia/Tokyo');
          const hour = createdAt.hour();
          
          hoursSet.add(hour);

          if (!groupedByLift[liftId]) {
            groupedByLift[liftId] = [];
          }

          groupedByLift[liftId].push({
            status: log.status,
            created_at: log.created_at,
            round_created_at: log.created_at,
          });
        });

        const hours = Array.from(hoursSet).sort((a, b) => a - b);

        if (Object.keys(groupedByLift).length === 0 || hours.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        const liftSegments: LiftSegmentsByLiftId = {};
        for (const [liftId, liftLogs] of Object.entries(groupedByLift)) {
          liftSegments[Number(liftId)] = getSegmentsAndGroups(liftLogs, hours);
        }

        setData({ liftSegments, hours });
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching resort data:', err);
          setData(null);
          setLoading(false);
        }
      }
    };

    fetchData();

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
