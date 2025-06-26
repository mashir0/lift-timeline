export type OperationStatus =
  "OPERATING" |
  "OPERATION_SLOWED" |
  "STANDBY" |
  "SUSPENDED" |
  "OPERATION_TEMPORARILY_SUSPENDED" |
  "TODAY_CLOSED" |
  "outside-hours";

/***
 * Yukiyama API関連の型定義
 ***/
export type LiftBase = {
  id: number;
  object_id: string;
  name: string;
  start_time: string;
  end_time: string;
}

// APIから取得したデータの型
export type YukiyamaResponse = LiftBase & {
  comment: string;
  status: OperationStatus;
  groomed: string;
  updateDate: string;
}

/***
 * Supabase 関連の型定義
 ***/
// DBクエリのためのタイプ定義
export type DBQuery = {
  resort_id?: number;
  created_at?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
  };
  // range?: {
  //   from: string | number;
  //   to: string | number;
  // };
  // [key: string]: any;
} 

// DBのSki Resortの型(ski_resorts)
export type DBResort = {
  id: number;
  name: string;
  map_url: string;
  created_at: string;
  updated_at: string;
}

// DBのLiftの型(lifts)
export type DBLift = LiftBase & {
  resort_id: number;
  created_at: Date;
  updated_at: Date;
}

// DBのLift Statusの型(lift_status)
// データベースに保存する型
export type DBLiftStatus = {
  // id: 自動生成されるので不要
  // created_at: 自動生成されるので不要
  comment: string;
  status: OperationStatus;
  groomed: string;
  status_updated: Date;
  lift_id: number;
}

// DBのLift Statusの型(lift_status_jst)
// list_statusをJSTに変更したり、他のテーブルからSelectしたView
export type DBLiftStatusView = DBLiftStatus & {
  id: string;
  lift_name: string;
  resort_id: number;
  resort_name: string;
  created_at: string;
};

/***
 * DTO (Data Transfer Object)
 ***/
// Resorts一覧　id: {name, map_url}
export type ResortsDto = {
  [id: number]: { 
    name: string; 
    map_url: string; 
  };
}

// Lifts一覧　id: {name, start_time, end_time}
export type LiftsDto = {
  [resort_id: number]: { 
    [lift_id: number]: { 
      name: string; 
      start_time: string; 
      end_time: string; 
    };
  };
}

// リフト運行ログの型
export type liftStatus = {
  status: OperationStatus;
  created_at: string;
  round_created_at: string;
}


// 1日分の1リゾート内の全リフト運行ログ
// SupabaseDtoから Page.tsx->TimelinePage.tsx に渡す型
export type OneDayLiftLogs = {
  liftLogs: { [liftId: number]: liftStatus[] };
  hours: number[];
};

// 1リフトの運行ログを1セグメントごとに分割した型
export type LiftSegment = liftStatus & {
  startIndex: number;
  count: number;
  timeRange?: string; // 時間範囲（例: "17:53〜21:39"）
};

export type LiftSegmentsByLiftId = {
  [liftId: number]: Array<LiftSegment>;
};
