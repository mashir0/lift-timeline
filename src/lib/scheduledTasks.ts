import { createServiceClient, type SupabaseEnv } from '@/lib/supabase/server';
import { saveToLiftStatus } from './supabase';
import { getAllResorts } from './supabaseDto';
import { fetchYukiyamaApi } from './yukiyama';

/**
 * すべてのスキー場のリフト情報を更新する
 * Cloudflare CRONから直接実行される
 */
interface UpdateResponce {
  success: boolean; 
  message: string; 
  details?: Array<{
    resortId: string;
    resortName: string;
    success: boolean;
    count?: number;
    error?: string;
  }>;
}


export async function updateAllLiftStatuses(env?: SupabaseEnv): Promise<UpdateResponce> {
  try {
    // CRON 専用: リクエストスコープがないため cookies() を使わないサービス用クライアントを使用
    const supabase = createServiceClient(env);
    const resorts = await getAllResorts(supabase);
    
    if (Object.keys(resorts).length === 0) {
      console.warn('データベースにスキー場情報が見つかりませんでした。');
      return {
        success: false,
        message: 'スキー場情報がありません。'
      };
    }
    
    console.log(`${Object.keys(resorts).length}件のスキー場情報を取得しました。更新を開始します...`);
    
    // すべてのリゾートのAPIデータを取得するためのコンテナ
    const allStatusData = [];
    const results = [];
    const resortsEntries = Object.entries(resorts);
    
    // Step 1: すべてのリゾートからAPIデータを取得する
    for (const [id, resort] of resortsEntries) {
      try {
        console.log(`スキー場ID ${id} (${resort.name}) のリフト情報を取得中...`);
        const statuses = await fetchYukiyamaApi(id);
        console.log(`スキー場ID ${id} のリフト情報を ${statuses.length}件取得しました。`);
        
        // 取得したデータをすぐに保存せず、一時配列に追加
        allStatusData.push(...statuses);
        
        // 取得成功情報を記録
        results.push({
          resortId: id,
          resortName: resort.name,
          success: true,
          count: statuses.length
        });
      } catch (apiError) {
        // API取得エラー
        console.error(`スキー場ID ${id} のAPI取得処理中にエラー:`, apiError);
        const errorDetail = apiError instanceof Error ? apiError.message : JSON.stringify(apiError);
        results.push({
          resortId: id,
          resortName: resort.name,
          success: false,
          error: `[API取得エラー] ${errorDetail}`
        });
      }
    }
    
    console.log(`全スキー場からのデータ取得完了。合計 ${allStatusData.length}件のリフト情報をまとめて保存します...`);
    
    // Step 2: 全データを一括で保存
    if (allStatusData.length > 0) {
      try {
        const saveResult = await saveToLiftStatus(allStatusData, supabase);
        console.log(`一括保存完了: ${saveResult.message}`);
      } catch (dbError) {
        // DB保存エラー
        console.error(`リフトデータの一括保存中にエラー:`, dbError);
        const errorDetail = dbError instanceof Error ? dbError.message : JSON.stringify(dbError);
        
        // 保存エラーの場合、各リゾートの処理を失敗としてマーク
        results.forEach(result => {
          if (result.success) {
            result.success = false;
            result.error = `[DB保存エラー] ${errorDetail}`;
          }
        });
      }
    } else {
      console.warn('保存するリフトデータがありません。');
    }
    
    // 成功・失敗の集計とエラー内容の収集
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    const errorDetails = results
      .filter(r => !r.success)
      .map(r => `${r.resortName}(ID:${r.resortId}): ${r.error}`)
      .join('\n');
    
    console.log(`更新完了: 成功=${successCount}, 失敗=${errorCount}`);
    if (errorCount > 0) {
      console.error(`エラー詳細:\n${errorDetails}`);
    }
    
    return { 
      success: successCount > 0,
      message: `${Object.keys(resorts).length}件中${successCount}件のスキー場情報を更新しました。${allStatusData.length}件のリフト情報を保存しました。`,
      details: results
    };
  } catch (error) {
    // 予期せぬ全体的なエラー
    const errorMessage = error instanceof Error 
      ? `[全体エラー] ${error.name}: ${error.message}` 
      : `[全体エラー] ${JSON.stringify(error)}`;
    
    console.error('リフト状態の更新中に予期せぬエラーが発生しました:', errorMessage);
    return { 
      success: false, 
      message: errorMessage
    };
  }
} 