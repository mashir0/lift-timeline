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
        let errorSource = ''; // エラーが発生した場所（API or DB）
        let errorDetail = ''; // エラーの詳細
        
        try {
          // ステップ1: APIからリフト情報を取得
          console.log(`スキー場ID ${id} (${resort.name}) のリフト情報を取得中...`);
          
          try {
            const statuses = await fetchYukiyamaApi(id);
            console.log(`スキー場ID ${id} のリフト情報を ${statuses.length}件取得しました。`);
            
            // ステップ2: DBに保存
            try {
              const saveResult = await saveToLiftStatus(statuses);
              console.log(`スキー場ID ${id}: ${saveResult.message}`);
              
              // 成功レスポンスを返す
              return {
                resortId: id,
                resortName: resort.name,
                success: true,
                count: statuses.length
              };
            } catch (dbError) {
              // Supabase保存エラー
              errorSource = 'DB保存';
              errorDetail = dbError instanceof Error ? dbError.message : JSON.stringify(dbError);
              throw dbError; // 外側のcatchに処理を渡す
            }
          } catch (apiError) {
            // YukiyamaAPI取得エラー
            errorSource = 'API取得';
            errorDetail = apiError instanceof Error ? apiError.message : JSON.stringify(apiError);
            throw apiError; // 外側のcatchに処理を渡す
          }
        } catch (error) {
          // エラーの種類を明示して記録
          console.error(`スキー場ID ${id} の${errorSource}処理中にエラー:`, error);
          return {
            resortId: id,
            resortName: resort.name,
            success: false,
            error: `[${errorSource}エラー] ${errorDetail || (error instanceof Error ? error.message : String(error))}`
          };
        }
      })
    );
    
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
      message: `${Object.keys(resorts).length}件中${successCount}件のスキー場情報を更新しました。`,
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