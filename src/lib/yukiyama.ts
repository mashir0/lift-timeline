import { YukiyamaResponse } from "@/types";


/**
 * 指定されたスキー場IDのリフト情報を取得する。
 * baseUrl は呼び出し元で Worker env（YUKIYAMA_API）から渡すこと。環境変数はここでは読まない。
 */
export const fetchYukiyamaApi = async (
  skiareaId: string,
  baseUrl: string
): Promise<YukiyamaResponse[]> => {
  const baseQuery = "?facilityType=lift&lang=jp";

  try {
    const url = `${baseUrl}${baseQuery}&skiareaId=${skiareaId}`;
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