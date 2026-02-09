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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sznxerzsfogdjksfpcgo.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bnhlcnpzZm9nZGprc2ZwY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NzgwMTEsImV4cCI6MjA1NzI1NDAxMX0.6zMh5fgo4bWpPMKHV9gMsGS4LxoABfzD3sLh3UFlAHk';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
