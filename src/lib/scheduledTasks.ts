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
      return {
        success: false,
        message: 'No resorts found in database'
      };
    }
    
    // 各スキー場のリフト情報を更新
    const results = await Promise.all(
      Object.entries(resorts).map(async ([id, resort]) => {
        try {
          // APIからリフト情報を取得
          const statuses = await fetchYukiyamaApi(id);
          // console.log('🚀 ~ Object.entries ~ statuses:', statuses)

          // DBに保存
          await saveToLiftStatus(statuses);
          
          return {
            resortId: id,
            resortName: resort.name,
            success: true,
            count: statuses.length
          };

        } catch (error) {
          console.error(`Error updating lift statuses for resort ${id}:`, error);
          return {
            resortId: id,
            resortName: resort.name || 'Unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    
    return { 
      success: successCount > 0,
      message: `Updated ${successCount}/${Object.keys(resorts).length} resorts' lift statuses`,
      details: results
    };
    
  } catch (error) {
    console.error('Error updating all lift statuses:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 