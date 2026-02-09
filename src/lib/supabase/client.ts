import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Components 用の Supabase クライアントを作成
 * 
 * @returns Supabase クライアントインスタンス
 * 
 * 【使用例】
 * ```typescript
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 * 
 * export function MyComponent() {
 *   const supabase = createClient();
 *   // ...
 * }
 * ```
 * 
 * 【将来の拡張ポイント】
 * - 認証機能を追加する際は、このクライアントで supabase.auth を使用可能
 * - リアルタイムサブスクリプションもこのクライアントで実装
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
