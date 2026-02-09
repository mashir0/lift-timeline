import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server Components 用の Supabase クライアントを作成
 * 
 * @returns Supabase クライアントインスタンス
 * 
 * 【将来の拡張ポイント】
 * - Middleware を追加する際は、そちらでセッションのリフレッシュを行う
 * - 認証機能を追加する際は、このクライアントで supabase.auth.getUser() を使用可能
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // 現時点では認証なしのため、エラーハンドリングのみ
          // Server Component では cookie の書き込みができない場合がある
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Cookie の書き込みに失敗した場合は無視
            // 注意: Middleware を追加する際は、そちらで適切に処理する必要がある
          }
        },
      },
    }
  );
}
