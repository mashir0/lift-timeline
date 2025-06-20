import { NextResponse } from 'next/server';
import { updateAllLiftStatuses } from '@/lib/scheduledTasks';

export async function GET() {
  console.log('リフト情報更新APIが呼び出されました:', new Date().toISOString());
  
  try {
    console.log('リフト情報の更新を開始します...');
    const result = await updateAllLiftStatuses();
    
    if (result.success) {
      console.log('リフト情報の更新に成功しました:', result.message);
    } else {
      console.warn('リフト情報の更新に部分的に失敗:', result.message);
    }
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 207,  // 部分的成功は207 Multi-Status
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('リフト情報の更新中に致命的なエラーが発生しました:', errorMessage);
    
    // エラー詳細をレスポンスに含める
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        timestamp: new Date().toISOString(),
        error_details: error instanceof Error ? {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        }
      }
    );
  }
} 