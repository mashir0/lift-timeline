import { getAllResorts, getAllLifts } from '@/lib/supabaseDto';
import { TimelinePage } from '@/components/TimelinePage';
import dayjs from '@/util/dayjs';
import { redirect } from 'next/navigation';

// ISR設定は Cloudflare Pages では使用できないため削除
// export const revalidate = 300;

const today = dayjs.tz('2025-04-18', 'Asia/Tokyo').startOf('day');
const todayStr = today.format('YYYY-MM-DD');

export default async function Home(props: {
  searchParams: Promise<{ date?: string; mode?: string }>;
}) {
  const searchParams = await props.searchParams;
  const dateParam = searchParams.date as string | undefined;
  const modeParam = (searchParams.mode as 'daily' | 'weekly' | undefined) ?? 'daily';
  const mode = modeParam === 'weekly' ? 'weekly' : 'daily';

  // 初回アクセス（date 未指定）または日付不正時は本日・現在の mode でリダイレクト
  const redirectToToday = () => redirect(`/?date=${todayStr}&mode=${mode}`);

  if (!dateParam) {
    redirectToToday();
  }

  const date = dayjs.tz(dateParam, 'UTC').tz('Asia/Tokyo');
  if (!date.isValid()) {
    redirectToToday();
  }

  const dateStr = date.format('YYYY-MM-DD');
  const sevenDaysAgo = today.subtract(6, 'day').tz('Asia/Tokyo');
  const canGoPrevious = date.tz('Asia/Tokyo').isAfter(sevenDaysAgo);
  const canGoNext = date.tz('Asia/Tokyo').isBefore(today.tz('Asia/Tokyo'));

  const prevDateStr = date.subtract(1, 'day').format('YYYY-MM-DD');
  const nextDateStr = date.add(1, 'day').format('YYYY-MM-DD');
  const prevUrl = `/?date=${prevDateStr}&mode=${mode}`;
  const nextUrl = `/?date=${nextDateStr}&mode=${mode}`;
  const todayUrl = `/?date=${todayStr}&mode=${mode}`;
  const dailyUrl = `/?date=${dateStr}&mode=daily`;
  const weeklyUrl = `/?date=${dateStr}&mode=weekly`;

  const lastUpdated = new Date();

  try {
    const [resorts, lifts] = await Promise.all([
      getAllResorts(),
      getAllLifts(),
    ]);

    const resortIds = Object.keys(resorts);

    return (
      <TimelinePage
        resortIds={resortIds}
        resorts={resorts}
        lifts={lifts}
        dateStr={dateStr}
        mode={mode}
        todayStr={todayStr}
        prevUrl={prevUrl}
        nextUrl={nextUrl}
        todayUrl={todayUrl}
        dailyUrl={dailyUrl}
        weeklyUrl={weeklyUrl}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        lastUpdated={lastUpdated}
      />
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    return (
      <div>
        <h1>Error</h1>
      </div>
    );
  }
}
