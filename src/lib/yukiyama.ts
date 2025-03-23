import { YukiyamaResponse } from "@/types";


/**
 * 指定されたスキー場IDのリフト情報を取得する
 */
export const fetchYukiyamaApi = async (skiareaId: string): Promise<YukiyamaResponse[]> => {
  const yukiyamaApi = process.env.NEXT_PUBLIC_YUKIYAMA_API; 
  const baseQuery = "?facilityType=lift&lang=jp";

  try {
    const url = `${yukiyamaApi}${baseQuery}&skiareaId=${skiareaId}`;
    const response = await fetch(url);
    
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