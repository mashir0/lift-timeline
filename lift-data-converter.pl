#!/usr/bin/perl

use strict;
use warnings;
use Encode;
use utf8;

# 標準出力にUTF-8を設定
binmode(STDOUT, ":utf8");
binmode(STDERR, ":utf8");

# スキーエリアIDの配列を定義
my @ski_area_ids = ( 226, 227, 228, 229, 230, 231, 232, 234, 251, 252 );

# APIのベースURLを定義
my $api_base_url = "https://web-api.yukiyama.biz/web-api/latest-facility/backward";

# 出力CSVファイル名
my $lifts_csv = "lifts.csv";

# CSVファイルをオープン
open my $lifts_fh, ">:encoding(utf8)", $lifts_csv or die "Cannot open $lifts_csv: $!";

# CSVヘッダーを手動で書き込む (created_at, updated_atは除外)
print $lifts_fh "resort_id,id,object_id,name,start_time,end_time\n";

# ユニコードエスケープシーケンスをデコードする関数
sub decode_unicode_escape {
    my ($str) = @_;
    $str =~ s/\\u([0-9a-fA-F]{4})/chr(hex($1))/eg;
    return $str;
}

foreach my $resort_id (@ski_area_ids) {
    print "スキーエリアID: $resort_id のデータを取得中...\n";
    
    # APIエンドポイント構築
    my $api_url = "$api_base_url?skiareaId=$resort_id&facilityType=lift&lang=jp";
    
    # 一時ファイル
    my $tmp_file = "/tmp/lift_data_$resort_id.json";
    
    # curlを使用してAPIデータを取得（-kオプションでSSL検証をスキップ）
    system("curl -k -s -o $tmp_file '$api_url'");
    
    if ($? != 0) {
        warn "APIリクエスト失敗 (スキーエリアID: $resort_id): curl 実行エラー\n";
        next;
    }
    
    # 一時ファイルを読み込む
    open my $json_fh, "<:encoding(utf8)", $tmp_file or do {
        warn "JSONファイルを開けません: $!\n";
        next;
    };
    
    my $json_content = do { local $/; <$json_fh> };
    close $json_fh;
    
    # デバッグ用: JSONの先頭部分を表示
    print "JSONデータのプレビュー: " . substr($json_content, 0, 100) . "...\n";
    
    # 一時ファイルを削除
    unlink $tmp_file;
    
    # resultsオブジェクト内の配列を抽出
    my @lifts = ();
    
    # "results"配列を抽出
    if ($json_content =~ /"results"\s*:\s*\[(.*)\]/s) {
        my $results_content = $1;
        
        # 各リフトのJSONオブジェクトを抽出
        while ($results_content =~ /\{([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}/g) {
            my $lift_json = $1;
            my %lift;
            
            # 各フィールドを抽出（実際のレスポンス構造に合わせて修正）
            if ($lift_json =~ /"id"\s*:\s*(\d+)/) {
                $lift{id} = $1;
            }
            
            if ($lift_json =~ /"object_id"\s*:\s*"([^"]*)"/) {
                $lift{object_id} = $1;
            }
            
            if ($lift_json =~ /"name"\s*:\s*"([^"]*)"/) {
                # ユニコードエスケープシーケンスをデコード
                $lift{name} = decode_unicode_escape($1);
            }
            
            if ($lift_json =~ /"start_time"\s*:\s*"([^"]*)"/) {
                $lift{start_time} = $1;
            }
            
            if ($lift_json =~ /"end_time"\s*:\s*"([^"]*)"/) {
                $lift{end_time} = $1;
            }
            
            push @lifts, \%lift;
        }
    } else {
        warn "予期しないJSON形式 (スキーエリアID: $resort_id): 'results'が見つかりません\n";
        next;
    }
    
    print "抽出されたリフト数: " . scalar(@lifts) . "\n";
    
    # データを処理してCSVに書き込み
    foreach my $lift (@lifts) {
        # リフト基本情報を取得
        my $lift_id = $lift->{id} || '';
        my $object_id = $lift->{object_id} || '';
        my $name = $lift->{name} || '';
        $name =~ s/,/\\,/g; # CSVのカンマをエスケープ
        $name =~ s/"/""/g;  # CSVのダブルクォートをエスケープ
        
        # 時間情報
        my $start_time = $lift->{start_time} || '';
        my $end_time = $lift->{end_time} || '';
        
        # lifts.csvにデータを書き込み（標準的なCSV形式）
        # created_at と updated_at は除外
        my $lifts_line = join(",", 
            $resort_id,
            $lift_id,
            qq("$object_id"),
            qq("$name"),
            $start_time,
            $end_time
        );
        print $lifts_fh "$lifts_line\n";
    }
}

# ファイルを閉じる
close $lifts_fh;

print "処理が完了しました。\n";
print "リフト基本情報: $lifts_csv\n";
