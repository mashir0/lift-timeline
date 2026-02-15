'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/Header';
import { TimelineControls } from '@/components/TimelineControls';
import { Legend } from '@/components/Legend';
import { ResortCardFetcher } from '@/components/ResortCardFetcher';
import dayjs from '@/util/dayjs';
import type { ResortsDto, LiftsDto } from '@/types';
import { REFERENCE_DATE } from '@/lib/constants';

const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** 選択日付が不正・範囲外・未来で、全ゲレンデでリフト情報が無い状態か */
function isDateWithNoLiftData(
  dateStr: string,
  today: dayjs.Dayjs,
  sevenDaysAgo: dayjs.Dayjs
): boolean {
  if (!DATE_STR_REGEX.test(dateStr)) return true;
  const date = dayjs.tz(dateStr, 'Asia/Tokyo').startOf('day');
  if (!date.isValid()) return true;
  if (date.isAfter(today)) return true; // 未来
  if (date.isBefore(sevenDaysAgo)) return true; // 範囲外（過去）
  return false;
}

export default function Home() {
  const today = REFERENCE_DATE
    ? dayjs.tz(REFERENCE_DATE, 'Asia/Tokyo').startOf('day')
    : dayjs.tz(new Date(), 'Asia/Tokyo').startOf('day');
  const todayStr = today.format('YYYY-MM-DD');

  const [dateStr, setDateStr] = useState(todayStr);
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [resorts, setResorts] = useState<ResortsDto | null>(null);
  const [lifts, setLifts] = useState<LiftsDto | null>(null);
  const [loading, setLoading] = useState(true);

  // 初期データ取得
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('Environment check:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });

        const supabase = createClient();

        const [resortsResult, liftsResult] = await Promise.all([
          supabase.from('ski_resorts').select('*'),
          supabase.from('lifts').select('*'),
        ]);

        if (resortsResult.error || liftsResult.error) {
          console.error('Supabase error details:', {
            resortsError: resortsResult.error,
            liftsError: liftsResult.error,
          });
          setLoading(false);
          return;
        }

        // データをオブジェクト形式に変換
        const resortsData: ResortsDto = {};
        resortsResult.data?.forEach((resort: any) => {
          resortsData[resort.id] = resort;
        });

        const liftsData: LiftsDto = {};
        liftsResult.data?.forEach((lift: any) => {
          if (!liftsData[lift.resort_id]) {
            liftsData[lift.resort_id] = {};
          }
          liftsData[lift.resort_id][lift.id] = lift;
        });

        setResorts(resortsData);
        setLifts(liftsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          fullError: err,
        });
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleDateChange = (newDate: string) => {
    setDateStr(newDate);
  };

  const handleModeChange = (newMode: 'daily' | 'weekly') => {
    setMode(newMode);
  };

  if (loading || !resorts || !lifts) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const resortIds = Object.keys(resorts);
  const date = dayjs.tz(dateStr, 'UTC').tz('Asia/Tokyo');
  const sevenDaysAgo = today.subtract(6, 'day');
  const canGoPrevious = date.isAfter(sevenDaysAgo);
  const canGoNext = date.isBefore(today);
  const noLiftDataForAnyResort = isDateWithNoLiftData(dateStr, today, sevenDaysAgo);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header lastUpdated={new Date()} />
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <TimelineControls
          mode={mode}
          dateStr={dateStr}
          todayStr={todayStr}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onDateChange={handleDateChange}
          onModeChange={handleModeChange}
        />
        {noLiftDataForAnyResort ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-600">
            リフト情報がありません
          </div>
        ) : resortIds.length === 0 ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {resortIds.map((id) => (
              <ResortCardFetcher
                key={`${id}-${dateStr}-${mode}`}
                resortId={id}
                dateStr={dateStr}
                mode={mode}
                resort={resorts[Number(id)]}
                lifts={lifts[Number(id)]}
              />
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
