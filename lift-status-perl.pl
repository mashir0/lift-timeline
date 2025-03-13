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
my $start_date = "2025-03-10"; # 開始日 (YYYY-MM-DD形式)
my $num_days = 3;              # 生成する日数
my $start_hour = 7;            # 1日の開始時間
my $end_hour = 18;             # 1日の終了時間（この時間は含まない）
my $interval_minutes = 5;      # タイムスタンプの間隔（分）

# リフト運行状態に関する設定
my $operating_rate = 0.97;     # 稼働率（8:00〜17:00の間）例: 0.97 = 97%
my $closed_continue_rate = 0.8; # 運休が継続する確率

# 時間帯の設定
my $preparing_start_hour = 7;  # 準備時間の開始時刻
my $operating_start_hour = 8;  # 運行時間の開始時刻
my $operating_end_hour = 17;   # 運行時間の終了時刻

# リゾートとリフトの対応関係の定義
my %resort_lifts = (
    'resort_01' => ['lift_01', 'lift_02', 'lift_03'],
    'resort_02' => ['lift_01'],
    'resort_03' => ['lift_01', 'lift_02'],
    'resort_04' => ['lift_01', 'lift_02', 'lift_03', 'lift_04'],
    'resort_05' => ['lift_01', 'lift_02', 'lift_03', 'lift_04', 'lift_05'],
);

# ステータスの定義
my %statuses = (
    'operating' => '運行中',
    'outside-hours' => '営業時間外',
    'preparing' => '準備中',
    'closed' => '運休中',
);

##################################
# ここから処理ロジック（メイン） #
##################################

# リフトごとの前回のステータスを追跡
my %previous_status;

# CSVヘッダーを出力
print "resort_id,lift_id,status,status_ja,created_at\n";

# 開始日を解析
my $current_date = Time::Piece->strptime($start_date, "%Y-%m-%d");

# タイムスタンプセットを追跡（重複を避けるため）
my %used_timestamps;

# 指定された日数分ループ
for (my $day = 0; $day < $num_days; $day++) {
    # 日付を設定
    my $date = $current_date + ($day * ONE_DAY);
    my $date_str = $date->strftime("%Y-%m-%d");
    
    # 日が変わったらリフトの状態をリセット
    %previous_status = ();
    
    # 時間帯ごとにループ
    for (my $hour = $start_hour; $hour < $end_hour; $hour++) {
        # 時間内で5分ごとにループ
        for (my $minute = 0; $minute < 60; $minute += $interval_minutes) {
            # 各リゾートごとにループ
            foreach my $resort_id (sort keys %resort_lifts) {
                # このリゾートに対してユニークなタイムスタンプを生成
                my $timestamp = generate_unique_timestamp($date_str, $hour, $minute, $resort_id, \%used_timestamps);
                
                # 各リフトについてデータを生成
                foreach my $lift_id (@{$resort_lifts{$resort_id}}) {
                    # リフト識別子を作成
                    my $lift_key = "$resort_id:$lift_id";
                    
                    # 時間帯と前回のステータスに応じたステータスを取得
                    my $status = get_status_for_time($hour, $lift_key);
                    my $status_ja = $statuses{$status};
                    
                    # 今回のステータスを保存
                    $previous_status{$lift_key} = $status;
                    
                    # CSV行を出力
                    print "$resort_id,$lift_id,$status,$status_ja,$timestamp\n";
                }
            }
        }
    }
}

##################################
# ユーティリティ関数             #
##################################

# ユニークなタイムスタンプを生成する関数 (JST形式)
sub generate_unique_timestamp {
    my ($date_str, $hour, $base_minute, $resort_id, $used_timestamps_ref) = @_;
    
    # リゾートIDを数値化して0.01〜0.99の範囲にマッピング
    my $resort_num = 0;
    if ($resort_id =~ /resort_(\d+)/) {
        $resort_num = $1;
    }
    
    # 試行回数の上限
    my $max_attempts = 100;
    my $attempt = 0;
    
    while ($attempt < $max_attempts) {
        # リゾート固有の分数のオフセットを計算（小数点以下も含む）
        my $minute_offset = ($resort_num * 0.7) % 4.9;
        
        # ランダム要素を加える
        my $random_offset = rand(0.8);
        
        # 分を計算（小数点以下も保持）
        my $minute_float = $base_minute + $minute_offset + $random_offset;
        
        # 60分を超えないように調整
        while ($minute_float >= 60) {
            $minute_float -= 60;
        }
        
        # 整数部と小数部に分割
        my $minute_int = int($minute_float);
        my $fractional = $minute_float - $minute_int;
        
        # 秒とミリ秒に変換
        my $seconds = int($fractional * 60);
        my $milliseconds = int(($fractional * 60 - $seconds) * 1000);
        
        # さらにリゾート固有の要素を秒に追加
        $seconds = ($seconds + $resort_num * 3) % 60;
        
        # ミリ秒にもリゾート固有の要素を追加
        $milliseconds = ($milliseconds + $resort_num * 17) % 1000;
        
        # タイムスタンプ文字列を生成 (JSTタイムゾーン)
        my $timestamp = sprintf(
            "%s %02d:%02d:%02d.%03d+09",
            $date_str, $hour, $minute_int, $seconds, $milliseconds
        );
        
        # このタイムスタンプとリゾートの組み合わせがまだ使われていないか確認
        my $key = "$resort_id:$timestamp";
        if (!exists $used_timestamps_ref->{$key}) {
            # 使用済みとしてマーク
            $used_timestamps_ref->{$key} = 1;
            return $timestamp;
        }
        
        # 次の試行へ
        $attempt++;
    }
    
    # 最大試行回数を超えた場合、現在時刻から一意のタイムスタンプを生成
    my $fallback = time() + $resort_num;
    return strftime("%Y-%m-%d %H:%M:%S", localtime($fallback)) . sprintf(".%03d+09", rand(1000));
}

# 時間帯と前回のステータスに応じたステータスを生成
sub get_status_for_time {
    my ($hour, $lift_key) = @_;
    
    # 準備時間: 準備中
    if ($hour >= $preparing_start_hour && $hour < $operating_start_hour) {
        return 'preparing';
    }
    
    # 運行時間: 稼働率に応じてステータスを決定
    if ($hour >= $operating_start_hour && $hour < $operating_end_hour) {
        # 前回の状態が「運休中」の場合は継続率に応じて継続
        if (exists $previous_status{$lift_key} && $previous_status{$lift_key} eq 'closed') {
            return (rand() < $closed_continue_rate) ? 'closed' : 'operating';
        }
        
        # 通常時: 稼働率に応じて運行中または運休中
        return (rand() < $operating_rate) ? 'operating' : 'closed';
    }
    
    # それ以外の時間: 営業時間外
    return 'outside-hours';
}
