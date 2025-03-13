export type OperationStatus = 'operating' | 'closed' | 'preparing' | 'investigating' | 'outside-hours';

export type TimeSlot = {
  hour: number;
  status: OperationStatus;
  statusJa: string;
};
export type LiftInfo = {
  id: string;
  name: string;
};

export type LiftStatus = {
  id: string;
  status: OperationStatus;
  status_ja: string;
  created_at: string;
};

export type Resort = {
  id: string;
  name: string;
  status: 'all-available' | 'partially-available';
  lifts: LiftInfo[];
  mapUrl: string;
  infoUrl: string;
};

export type TimelineData = {
  [liftId: string]: {
    [hour: string]: OperationStatus;
  };
};

export type WeeklyData = {
  [liftId: string]: {
    [day: string]: 'operating' | 'closed';
  };
};

/***
 * API関連の型定義
 ***/
// APIから取得したデータの型
export type LiftStatusResponse = {
  resortId: string;
  liftId: string;
  timestamp: string;
  status: OperationStatus;
  statusJa: string;
};

// DBの型
export type ResortLiftStatus = {
  id: string;
  resort_id: string;
  lift_id: string;
  status: OperationStatus;
  status_ja: string;
  created_at: string;
};

// DBから取得したデータを整形
export type LiftLogs = {
  [liftId: string]: Array<{
    status: OperationStatus;
    status_ja: string;
    created_at: string;
  }>;
}

// DBから取得したデータを整形
export type LiftLogsByDate = {
  [date: string]: LiftLogs;
}

// リゾートごとのログを取得してFrontで利用する際の型 
export type ResortLiftLogs = {
  [resortId: string]: LiftLogsByDate;
};

// リフト1つの運行ログ配列
export type LiftStatusLogs = Array<{
  status: OperationStatus;
  status_ja: string;
  created_at: string;
}>;

// 1日分のリゾート内の全リフト運行ログ
export type DailyLiftLogs = {
  [liftId: string]: LiftStatusLogs;
};

// リゾート1つの日付ごとの運行ログ
export type ResortLiftLogsByDate = {
  [date: string]: DailyLiftLogs;
};

// 全リゾートの運行ログデータ
export type AllResortsLiftLogs = {
  [resortId: string]: ResortLiftLogsByDate;
};