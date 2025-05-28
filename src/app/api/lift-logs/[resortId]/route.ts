import { fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { resortId: string } }
) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    const resortId = parseInt(params.resortId);
    if (isNaN(resortId)) {
      return NextResponse.json({ error: 'Invalid resort ID' }, { status: 400 });
    }

    const liftLogs = await fetchOneDayLiftLogs(resortId, date);
    return NextResponse.json(liftLogs);
  } catch (error) {
    console.error('Error fetching lift logs:', error);
    return NextResponse.json({ error: 'Failed to fetch lift logs' }, { status: 500 });
  }
} 