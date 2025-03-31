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


export async function updateAllLiftStatuses(): Promise<UpdateResponce> {
  try {
    // スキー場情報を取得（共通モジュールから）
    const resorts = await getAllResorts();
    
    if (Object.keys(resorts).length === 0) {
      console.warn('データベースにスキー場情報が見つかりませんでした。');
      return {
        success: false,
        message: 'スキー場情報がありません。'
      };
    }
    
    console.log(`${Object.keys(resorts).length}件のスキー場情報を取得しました。更新を開始します...`);
    
    // 各スキー場のリフト情報を更新
    const results = await Promise.all(
      Object.entries(resorts).map(async ([id, resort]) => {
        try {
          // ステップ1: APIからリフト情報を取得
          console.log(`スキー場ID ${id} (${resort.name}) のリフト情報を取得中...`);
          const statuses = await fetchYukiyamaApi(id);
          console.log(`スキー場ID ${id} のリフト情報を ${statuses.length}件取得しました。`);

          // ステップ2: DBに保存
          const saveResult = await saveToLiftStatus(statuses);
          console.log(`スキー場ID ${id}: ${saveResult.message}`);
          
          // 成功レスポンスを返す
          return {
            resortId: id,
            resortName: resort.name,
            success: true,
            count: statuses.length
          };
        } catch (error) {
          // エラーの種類に関係なく、このリゾートの処理に失敗したことを記録
          console.error(`スキー場ID ${id} の処理中にエラーが発生:`, error);
          return {
            resortId: id,
            resortName: resort.name || 'Unknown',
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
          };
        }
      })
    );
    
    // 成功・失敗の集計
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    console.log(`更新完了: 成功=${successCount}, 失敗=${errorCount}`);
    
    return { 
      success: successCount > 0,
      message: `${Object.keys(resorts).length}件中${successCount}件のスキー場情報を更新しました。`,
      details: results
    };
    
  } catch (error) {
    // 予期せぬ全体的なエラー
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    console.error('リフト状態の更新中に予期せぬエラーが発生しました:', errorMessage);
    return { 
      success: false, 
      message: errorMessage
    };
  }
} 