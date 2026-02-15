import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** CRON 用に Worker の env から渡される設定（NEXT_PUBLIC_ 接頭辞は使わない） */
export type SupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  YUKIYAMA_API?: string;
  REFERENCE_DATE?: string;
};

/**
 * リクエストスコープ外（CRON 等）で使う Cookie なしの Supabase クライアント。
 * updateAllLiftStatuses など CRON 専用パスから明示的に使用すること。
 * Worker env（process.env）のみを参照する。
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing');
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

/**
 * Server Components / API Routes 用の Supabase クライアントを作成。
 * リクエストスコープ外（Worker CRON 等）の場合は Cookie を使わないクライアントにフォールバックする。
 *
 * @returns Supabase クライアントインスタンス
 */
export async function createClient() {
  try {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component では cookie の書き込みができない場合がある
            }
          },
        },
      }
    );
  } catch (error) {
    // リクエストスコープ外（CRON 等）では cookies() が使えない場合のみフォールバック。
    // それ以外のエラー（OAuth 等）はすり抜け防止のため再スローする。
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('outside a request scope') || message.includes('cookies')) {
      return createServiceClient();
    }
    throw error;
  }
}
