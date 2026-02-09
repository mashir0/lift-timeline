import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import dayjs from '@/util/dayjs';

type TimelineControlsProps = {
  mode: 'daily' | 'weekly';
  dateStr: string;
  todayStr: string;
  prevUrl: string;
  nextUrl: string;
  todayUrl: string;
  dailyUrl: string;
  weeklyUrl: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export function TimelineControls({
  mode,
  dateStr,
  todayStr,
  prevUrl,
  nextUrl,
  todayUrl,
  dailyUrl,
  weeklyUrl,
  canGoPrevious,
  canGoNext,
}: TimelineControlsProps) {
  const currentDate = dayjs.tz(dateStr, 'UTC').tz('Asia/Tokyo');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.format('YYYY年MM月DD日')}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {mode === 'daily' && (
            <div className="flex items-center gap-2">
              {canGoPrevious ? (
                <Link
                  href={prevUrl}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </Link>
              ) : (
                <span
                  className="p-2 rounded-xl opacity-50 cursor-not-allowed"
                  aria-disabled
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </span>
              )}
              <Link
                href={todayUrl}
                className="px-4 py-2 rounded-xl hover:bg-gray-100"
              >
                今日
              </Link>
              {canGoNext ? (
                <Link
                  href={nextUrl}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </Link>
              ) : (
                <span
                  className="p-2 rounded-xl opacity-50 cursor-not-allowed"
                  aria-disabled
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </span>
              )}
            </div>
          )}
          <div className="flex rounded-lg border border-gray-200">
            <Link
              href={dailyUrl}
              className={`px-4 py-2 text-sm rounded-l-lg ${
                mode === 'daily'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              日次表示
            </Link>
            <Link
              href={weeklyUrl}
              className={`px-4 py-2 text-sm rounded-r-lg ${
                mode === 'weekly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              週次表示
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
