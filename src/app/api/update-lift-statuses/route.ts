import { NextResponse } from 'next/server';
import { updateAllLiftStatuses } from '@/lib/scheduledTasks';

// CloudFlare Workersでの実行時にEdgeランタイムを指定
export const runtime = 'edge';

export async function GET() {
  try {
    const result = await updateAllLiftStatuses();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating lift statuses:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 