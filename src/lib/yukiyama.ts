import { YukiyamaResponse } from "@/types";


/**
 * 指定されたスキー場IDのリフト情報を取得する。
 * CRON では baseUrl を渡すこと（Worker では process.env が空のため）。
 */
export const fetchYukiyamaApi = async (
  skiareaId: string,
  baseUrl?: string
): Promise<YukiyamaResponse[]> => {
  const yukiyamaApi = baseUrl ?? process.env.NEXT_PUBLIC_YUKIYAMA_API;
  const baseQuery = "?facilityType=lift&lang=jp";

  try {
    const url = `${yukiyamaApi}${baseQuery}&skiareaId=${skiareaId}`;
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Yukiyama API: ${response.statusText}`);
    }
    
    const data = await response.json()
    return data.results 

  } catch (error) {
    console.error(`Yukiyama APIからのデータ取得に失敗しました (スキー場ID: ${skiareaId}):`, error);
    throw error;   
  }
}