import { createClient } from '@supabase/supabase-js';
import { DBQuery, DBLiftStatus, YukiyamaResponse } from '@/types';

/******************************************
 * Supabase base function
 ******************************************/
// シングルトンインスタンスを保持
// let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Supabaseクライアントを初期化する関数
const getSupabaseClient = (): ReturnType<typeof createClient> | null => {
  // if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase環境変数が設定されていません。');
      return null;
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Edge環境では永続化セッションは使用不可
      }
    });
    
    // try {
    //   supabaseInstance = createClient(supabaseUrl, supabaseKey);
    //   console.log('Supabase client initialized successfully');
    // } catch (error) {
    //   console.error('Error initializing Supabase client:', error);
    //   return null;
    // }
  // }
  // return supabaseInstance;
}

// テーブルからデータを取得する関数
export const fetchTable = async <T>(table: string, query: DBQuery = {}): Promise<T[]> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('Supabaseクライアントが初期化できませんでした。データは取得できません。');
    return [];
  }

  // クエリパラメータを分離
  const { resort_id, created_at, ...otherParams } = query;
  
  let queryBuilder = supabase
    .from(table)
    .select('*');

  // リゾートIDでフィルタリング
  if (resort_id) {
    queryBuilder = queryBuilder.eq('resort_id', resort_id);
  }

  // created_atの範囲でフィルタリング
  if (created_at?.gte) {
    queryBuilder = queryBuilder.gte('created_at', created_at.gte);
  }
  if (created_at?.lte) {
    queryBuilder = queryBuilder.lte('created_at', created_at.lte);
  }

  // その他のパラメータでフィルタリング
  Object.entries(otherParams).forEach(([key, value]) => {
    if (value !== undefined) {
      queryBuilder = queryBuilder.eq(key, value);
    }
  });

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error fetching data:', error);
    return [];
  }
  return (data || []) as T[];
};

// テーブルにデータを保存する関数
export const insertTable = async <T extends Record<string, unknown>>(table: string, data: T[]): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabaseクライアントが初期化できませんでした。データは保存されません。');
    return;
  }

  const { error } = await supabase
    .from(table)
    .insert(data);

  if (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
}; 

/******************************************
* DBに保存する関数
******************************************/
// リフトステータスの保存関数(API->DB.lift_status)
export const saveToLiftStatus = async (apiResponse: YukiyamaResponse[]): Promise<{ success: boolean; message: string }> => {
  if (!apiResponse || apiResponse.length === 0) {
    return {
      success: false,
      message: '[Supabase] 保存するリフトステータスデータがありません。',
    }
  }

  try {
    await insertTable<DBLiftStatus>('lift_status', 
      apiResponse.map((res) => ({
        lift_id: res.id,
        comment: res.comment,
        status: res.status,
        groomed: res.groomed,
        status_updated: new Date(res.updateDate),
      }))
    );
    
    return {
      success: true,
      message: `[Supabase] ${apiResponse.length}件のリフトステータスを保存しました。`,
    }
  } catch (error) {
    // エラーの詳細情報を取得
    let errorDetail = '';
    if (error instanceof Error) {
      errorDetail = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        // オブジェクトの場合はJSON文字列化を試みる
        errorDetail = JSON.stringify(error);
      } catch (e) {
        // JSON変換に失敗した場合
        errorDetail = Object.keys(error).map(key => `${key}: ${String((error as any)[key])}`).join(', ');
      }
    } else {
      errorDetail = String(error);
    }
    
    console.error('[Supabase] リフトステータスの保存中にエラーが発生しました:', errorDetail);
    
    // エラーメッセージに詳細を含める
    throw new Error(`[Supabase] DB保存エラー: ${errorDetail}`);
  }
};

