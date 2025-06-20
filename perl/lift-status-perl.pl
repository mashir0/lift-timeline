#!/usr/bin/perl
use strict;
use warnings;
use Time::Piece;
use Time::Seconds;
use POSIX qw(strftime);

###########################################
# 設定変数 - カスタマイズ可能なパラメータ #
###########################################

# 日付と時間の設定
my $start_date = "2025-03-17"; # 開始日 (YYYY-MM-DD形式)
my $num_days = 3;              # 生成する日数
my $start_hour = 7;            # 1日の開始時間
my $end_hour = 18;             # 1日の終了時間（この時間は含まない）
my $interval_minutes = 10;     # タイムスタンプの間隔（分）

# リフト運行状態に関する設定
my $operating_rate = 0.98;     # 稼働率（8:00〜17:00の間）例: 0.98 = 98%
my $other_status_continue_rate = 0.80; # 非OPERATING状態が継続する確率
my $back_to_operating_rate = 0.15;     # 非OPERATINGからOPERATINGに戻る確率
my $to_closed_rate = 0.05;             # 非OPERATINGからTODAY_CLOSEDになる確率

# 時間帯の設定
my $preparing_start_hour = 7;  # 準備時間の開始時刻
my $operating_start_hour = 8;  # 運行時間の開始時刻
my $operating_end_hour = 17;   # 運行時間の終了時刻

# リフトIDの定義
my @lift_ids = (148, 275, 318, 3, 4, 5, 6, 53, 54, 55, 56);

# ステータスの定義
my @statuses = (
    "OPERATING",
    "OPERATION_SLOWED",
    "STANDBY",
    "SUSPENDED",
    "OPERATION_TEMPORARILY_SUSPENDED",
    "TODAY_CLOSED"
);

##################################
# ここから処理ロジック（メイン） #
##################################

# リフトごとの前回のステータスを追跡
my %previous_status;
# TODAY_CLOSEDになった日付を追跡
my %today_closed_dates;
# ステータス更新時刻を追跡
my %status_updated_times;

# CSVヘッダーを出力
print "lift_id,status,groomed,comment,status_updated,created_at\n";

# 指定された日数分ループ
for (my $day = 0; $day < $num_days; $day++) {
    my $current_day = $day;
    
    # 日付の計算
    my $current_date = Time::Piece->strptime($start_date, "%Y-%m-%d");
    $current_date += ONE_DAY * $day;
    my $date_str = $current_date->strftime("%Y-%m-%d");
    
    # 時間帯ごとにループ
    for (my $hour = $start_hour; $hour < $end_hour; $hour++) {
        # 時間内でinterval_minutes分ごとにループ
        for (my $minute = 0; $minute < 60; $minute += $interval_minutes) {
            # 現在のAPI呼び出し時間を計算
            my $api_call_time = sprintf("%s %02d:%02d:00+09:00", $date_str, $hour, $minute);
            
            # データベース登録時間（API呼び出しから少し遅れる）
            my $db_time_seconds = rand() * 2; # 0〜2秒のランダム遅延
            my $db_time = sprintf("%s %02d:%02d:%02.0f+09:00", $date_str, $hour, $minute, $db_time_seconds);
            
            # 各リフトについてAPIからデータを取得したとみなす
            foreach my $lift_id (@lift_ids) {
                # リフト初期化（まだ処理されていない場合）
                if (!exists $previous_status{$lift_id}) {
                    $previous_status{$lift_id} = "OPERATING";
                    $status_updated_times{$lift_id} = "$date_str 07:00:00+09:00"; # 初期状態の更新時間
                    $today_closed_dates{$lift_id} = "";
                }
                
                my $current_status = $previous_status{$lift_id};
                my $new_status = $current_status;
                my $status_updated_time = $status_updated_times{$lift_id};
                
                # 状態確認と更新（API呼び出しタイミングで）
                # 時間帯に応じたステータス判定
                if ($hour < $operating_start_hour) {
                    # 準備時間: STANDBYステータス
                    if ($current_status ne "STANDBY") {
                        $new_status = "STANDBY";
                        $status_updated_time = $api_call_time;
                    }
                } elsif ($hour >= $operating_end_hour) {
                    # 営業時間外: TODAY_CLOSED
                    if ($current_status ne "TODAY_CLOSED") {
                        $new_status = "TODAY_CLOSED";
                        $status_updated_time = $api_call_time;
                        $today_closed_dates{$lift_id} = $date_str;
                    }
                } else {
                    # 営業時間内: 通常の状態遷移ロジック
                    
                    # TODAY_CLOSEDになった場合、その日は状態を変えない
                    if ($current_status eq "TODAY_CLOSED" && $today_closed_dates{$lift_id} eq $date_str) {
                        # 状態変更なし
                    } else {
                        # TODAY_CLOSEDフラグをリセット（日付が変わった場合）
                        if ($today_closed_dates{$lift_id} ne $date_str) {
                            $today_closed_dates{$lift_id} = "";
                        }
                        
                        # 状態の更新
                        my $rand = rand(1);
                        
                        if ($current_status eq "OPERATING") {
                            # 現在OPERATINGの場合
                            if ($rand > $operating_rate) {
                                # 他の状態に変化
                                my $idx = int(rand(5)) + 1; # OPERATING以外を選択
                                $new_status = $statuses[$idx];
                                $status_updated_time = $api_call_time;
                            }
                        } else {
                            # 現在OPERATING以外の場合
                            if ($rand <= $other_status_continue_rate) {
                                # 現在の状態を継続
                            } elsif ($rand <= ($other_status_continue_rate + $back_to_operating_rate)) {
                                # OPERATINGに戻る
                                $new_status = "OPERATING";
                                $status_updated_time = $api_call_time;
                            } else {
                                # TODAY_CLOSEDになる
                                $new_status = "TODAY_CLOSED";
                                $status_updated_time = $api_call_time;
                                $today_closed_dates{$lift_id} = $date_str;
                            }
                        }
                    }
                }
                
                # API呼び出しごとにデータを記録（状態に変化がなくても記録）
                # CSV行を出力 (lift_id,status,groomed,comment,status_updated,created_at)
                print "$lift_id,$new_status,,,$status_updated_time,$db_time\n";
                
                # 状態と更新時刻を記録
                $previous_status{$lift_id} = $new_status;
                $status_updated_times{$lift_id} = $status_updated_time;
            }
        }
    }
}
