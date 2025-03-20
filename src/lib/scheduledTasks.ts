// import { saveToLiftStatus } from './supabase';
// import { getAllResorts } from './supabaseDto';
// import type { YukiyamaResponse } from '@/types';

// const yukiyamaApi = "https://web-api.yukiyama.biz/web-api/latest-facility/backward";
// const baseQuery = "?facilityType=lift&lang=jp";

/**
 * 指定されたスキー場IDのリフト情報を取得する
 */
// async function fetchYukiyamaApi(skiareaId: string): Promise<YukiyamaResponse[]> {
//   const url = `${yukiyamaApi}${baseQuery}&skiareaId=${skiareaId}`;
  
//   console.log(`Fetching lift data from: ${url}`);
//   const response = await fetch(url);
  
//   if (!response.ok) {
//     throw new Error(`Failed to fetch from Yukiyama API: ${response.statusText}`);
//   }
  
//   return response.json();
// }

/**
 * すべてのスキー場のリフト情報を更新する
 * Cloudflare CRONから直接実行される
 */
// export async function updateAllLiftStatuses(): Promise<{ 
//   success: boolean; 
//   message: string; 
//   details?: Array<{
//     resortId: string;
//     resortName: string;
//     success: boolean;
//     count?: number;
//     error?: string;
//   }>;
// }> {
//   try {
//     // スキー場情報を取得（共通モジュールから）
//     const resorts = await getAllResorts();
    
//     if (Object.keys(resorts).length === 0) {
//       return {
//         success: false,
//         message: 'No resorts found in database'
//       };
//     }
    
//     // 各スキー場のリフト情報を更新
//     const results = await Promise.all(
//       Object.values(resorts).map(async (resort) => {
//         try {
//           // APIからリフト情報を取得
//           const statuses = await fetchYukiyamaApi(resort.id);
          
//           // DBに保存
//           await saveToLiftStatus(statuses);
          
//           return {
//             resortId: resort.id,
//             resortName: resort.name,
//             success: true,
//             count: statuses.length
//           };
//         } catch (error) {
//           console.error(`Error updating lift statuses for resort ${resort.id}:`, error);
//           return {
//             resortId: resort.id,
//             resortName: resort.name || 'Unknown',
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error'
//           };
//         }
//       })
//     );
    
//     const successCount = results.filter(r => r.success).length;
    
//     return { 
//       success: successCount > 0,
//       message: `Updated ${successCount}/${resorts.length} resorts' lift statuses`,
//       details: results
//     };
    
//   } catch (error) {
//     console.error('Error updating all lift statuses:', error);
//     return { 
//       success: false, 
//       message: error instanceof Error ? error.message : 'Unknown error occurred' 
//     };
//   }
// } 