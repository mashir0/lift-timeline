import { createClient } from '@supabase/supabase-js';
import { LiftStatusResponse, ResortLiftStatus, ResortLiftLogsByDate, DailyLiftLogs, LiftStatusLogs } from '@/types';
import { toJST } from './utils';

// Supabaseクライアントを初期化する関数
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== 'undefined') {
      // クライアントサイドでは、モックデータを返すか、エラーメッセージを表示
      console.error('Supabase環境変数が設定されていません。Cloudflare Pagesの環境変数設定を確認してください。');
      return null;
    }
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
};

type FetchParams = {
  resortId?: string;
  liftId?: string;
  startDate?: Date;
  endDate?: Date;
};

// 基本的なデータ取得関数
export const fetchFromDatabase = async (params: FetchParams = {}): Promise<ResortLiftStatus[]> => {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabaseクライアントが初期化できませんでした。モックデータを返します。');
    return []; // モックデータまたは空の配列を返す
  }
  
  let query = supabase
    // .from('lift_statuses')
    .from('lift_statuses_jst')
    .select('*');

  // 条件を動的に追加
  if (params.resortId) {
    query = query.eq('resort_id', params.resortId);
  }
  if (params.liftId) {
    query = query.eq('lift_id', params.liftId);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate.toISOString());
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate.toISOString());
  }

  // デフォルトで古い順
  // query = query.order('created_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching lift statuses:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return []; // エラー時は空の配列を返す
  }

  // console.log('data', data);
  return data as ResortLiftStatus[];
};

// 1週間分のログを取得してリゾート、リフト、日付でグループ化
export const fetchWeeklyLiftLogs = async (resortId: string): Promise<ResortLiftLogsByDate> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7日前からのデータを取得

  const data = await fetchFromDatabase({
    resortId,
    startDate,
    endDate
  });

  // 日付、リフトIDでグループ化
  const groupedLogs: ResortLiftLogsByDate = {};
  
  data.forEach(log => {
    // 日付（YYYY-MM-DD）を取得
    const date = log.created_at.split('T')[0];

    // 日付のグループを初期化
    if (!groupedLogs[date]) {
      groupedLogs[date] = {};
    }

    // リフトIDのグループを初期化
    if (!groupedLogs[date][log.lift_id]) {
      groupedLogs[date][log.lift_id] = [];
    }
    
    // ログを追加
    groupedLogs[date][log.lift_id].push({
      status: log.status,
      status_ja: log.status_ja,
      created_at: log.created_at
    });
  });
  return groupedLogs;
};

export const saveToDatabase = async (statuses: LiftStatusResponse[]): Promise<void> => {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabaseクライアントが初期化できませんでした。データは保存されません。');
    return;
  }
  
  const { error } = await supabase
    .from('lift_statuses')
    .insert(
      statuses.map((status) => {
        // タイムスタンプをJSTに変換
        const timestamp = toJST(new Date(status.timestamp));
        
        return {
          resort_id: status.resortId,
          lift_id: status.liftId,
          status: status.status,
          status_ja: status.statusJa,
          created_at: timestamp.toISOString()
        };
      })
    );

  if (error) {
    console.error('Error saving lift statuses:', error);
    // エラーをスローせず、ログに記録するだけ
  }
}; 