import { NextResponse } from 'next/server';
import { fetchMockLiftStatuses, saveToDatabase } from '@/lib';

export async function GET(request: Request) {
  try {
    // APIからの取得
    const statuses = await fetchMockLiftStatuses();
    
    // DBに保存
    try {
      await saveToDatabase(statuses);
    } catch (dbError) {
      // DBエラーは無視して処理を続行
      console.error('DB Error details:', dbError);
    }
    return NextResponse.json(statuses);

  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lift statuses' },
      { status: 500 }
    );
  }
} 