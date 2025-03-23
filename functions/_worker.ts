import { updateAllLiftStatuses } from '../src/lib/scheduledTasks';

// CloudFlare Workers上で実行するためのEdgeランタイム設定
export const runtime = 'edge';

// ヘルパー関数：レスポンスを生成
function createResponse(result: any): Response {
  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// CloudflareのEventListenerを登録
export default {
  // CRON実行時のハンドラー（5分ごとに実行、7:00〜19:00の間）
  async scheduled(event: any, env: any, ctx: any) {
    ctx.waitUntil(updateAllLiftStatuses());
  },

  // 手動実行用のHTTPハンドラー
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);
    
    // /api/update-lift-statuses エンドポイントでのみ手動実行を許可
    if (url.pathname === '/api/update-lift-statuses') {
      try {
        const result = await updateAllLiftStatuses();
        return createResponse(result);
      } catch (error) {
        return createResponse({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
    
    // その他のパスは404を返す
    return new Response('Not Found', { status: 404 });
  }
}; 