import type { OneDayLiftLogs } from '@/types';

// ✅ 推奨: 積極的なキャッシュ活用
export async function getCachedResortLogs(
  resortId: number, 
  date: string
): Promise<OneDayLiftLogs | null> {
  try {
    const cacheKey = `resort-${resortId}-${date}`;
    
    // CloudFlare Workers環境でのキャッシュ取得
    if (typeof caches !== 'undefined') {
      const cached = await caches.match(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for resort ${resortId} on ${date}`);
        return await cached.json();
      }
    }
    
    console.log(`❌ Cache miss for resort ${resortId} on ${date}`);
    return null;
  } catch (error) {
    console.error(`Error getting cached resort logs:`, error);
    return null;
  }
}

export async function setCachedResortLogs(
  resortId: number, 
  date: string, 
  data: OneDayLiftLogs
): Promise<void> {
  try {
    const cacheKey = `resort-${resortId}-${date}`;
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600' // 5分ローカル、10分CDN
      }
    });
    
    // CloudFlare Workers環境でのキャッシュ保存
    if (typeof caches !== 'undefined') {
      await caches.open('lift-timeline-cache').then(cache => {
        return cache.put(cacheKey, response);
      });
      
      console.log(`✅ Cached resort ${resortId} logs for ${date}`);
    }
  } catch (error) {
    console.error(`Error setting cached resort logs:`, error);
  }
}

// キャッシュの有効期限チェック
export function isCacheValid(cacheKey: string, maxAge: number = 300000): boolean {
  // 実装は簡略化（実際の実装ではキャッシュのメタデータを確認）
  return true;
}

// キャッシュのクリア
export async function clearCache(pattern?: string): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('lift-timeline-cache');
      const keys = await cache.keys();
      
      for (const key of keys) {
        if (!pattern || key.url.includes(pattern)) {
          await cache.delete(key);
          console.log(`🗑️ Cleared cache: ${key.url}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error clearing cache:`, error);
  }
} 