import { createClient } from '@/lib/supabase/server';
import { DBQuery, DBLiftStatus, YukiyamaResponse } from '@/types';

// 並び順とページネーションのオプション型
export type FetchOptions = {
  order?: Array<{
    column: string;
    ascending: boolean;
  }>;
  // オフセットベースのページネーション
  page?: number;
};

/******************************************
 * Supabase base function
 ******************************************/

// テーブルからデータを取得する関数
export const fetchTable = async <T>(
  table: string, 
  query: DBQuery = {}, 
  options: FetchOptions = {},
  limit: number = 1000,
): Promise<T[]> => {
  const supabase = await createClient();

  // クエリパラメータを分離
  const { resort_id, created_at } = query;
  
  let queryBuilder = supabase
    .from(table)
    .select('*');

  // クエリパラメータの設定 ------------------------------------------------------
  // リゾートIDでフィルタリング
  if (resort_id) {
    queryBuilder = queryBuilder.eq('resort_id', resort_id);
  }

  // 日付範囲クエリ
  if (created_at) {
    Object.entries(created_at).forEach(([filter, date]) => {
      queryBuilder = queryBuilder.filter('created_at', filter, date.toISOString());
      // console.log('🚀 ~ Object.entries ~ filter, date.toISOString():', filter, date.toISOString())
    });
  }

  // Optionsの設定 ------------------------------------------------------------
  // 並び順の設定
  if (options?.order && options.order.length > 0) {
    options.order.forEach(({ column, ascending }) => {
      queryBuilder = queryBuilder.order(column, { ascending: ascending });
    });
  }

  // 取得件数の制限
  queryBuilder = queryBuilder.limit(limit);

  // ページネーション ------------------------------------------------------------
  let allData: any[] = [];
  let hasMore = true;
  let from = (options?.page) ? (options.page - 1) * limit : 0; // ページ指定の場合はオフセットを計算
  let to = from + limit - 1;
    
  while (hasMore) {
    // 現在のオフセットから一定数のデータを取得
    const { data, error } = await queryBuilder.range(from, to);
    
    if (error) {
      console.error('Error fetching data:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += limit;
      to = from + limit - 1;
      
      // 取得件数がlimitより少ない or ページ指定の場合は終了
      if (data.length < limit || options?.page) {
        hasMore = false;
      }
    } else {
      // データがない場合は終了
      hasMore = false;
    }
  }
  return allData as T[];
};

// テーブルにデータを保存する関数
export const insertTable = async <T extends Record<string, unknown>>(table: string, data: T[]): Promise<void> => {
  const supabase = await createClient();

  const { error } = await supabase
    .from(table)
    .insert(data as any);

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

