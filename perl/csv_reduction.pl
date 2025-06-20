#!/usr/bin/perl
use strict;
use warnings;
use utf8;

# 標準出力をUTF-8に設定してワーニングを回避
binmode(STDOUT, ':utf8');
binmode(STDERR, ':utf8');

# CSVデータ削減スクリプト（Mac標準Perl対応）
# lift_id毎に連続する同じstatusのレコードを削除
# 外部モジュール不要

sub parse_csv_line {
    my $line = shift;
    chomp $line;
    $line =~ s/\r$//; # Windows改行コード対応
    
    return () if $line eq ''; # 空行はスキップ
    
    my @fields;
    my $field = '';
    my $in_quotes = 0;
    
    for my $char (split //, $line) {
        if ($char eq '"') {
            $in_quotes = !$in_quotes;
        } elsif ($char eq ',' && !$in_quotes) {
            push @fields, $field;
            $field = '';
        } else {
            $field .= $char;
        }
    }
    push @fields, $field;
    
    # クォートを除去
    for my $field (@fields) {
        $field =~ s/^"//;
        $field =~ s/"$//;
        $field =~ s/""/"/g;  # エスケープされたクォートを復元
    }
    
    return @fields;
}

sub format_csv_line {
    my @fields = @_;
    my @escaped_fields;
    
    for my $field (@fields) {
        # 空文字列、カンマ、改行、クォートを含む場合はクォートで囲む
        if ($field =~ /[",\n\r]/ || $field eq '') {
            $field =~ s/"/""/g;  # クォートをエスケープ
            push @escaped_fields, '"' . $field . '"';
        } else {
            push @escaped_fields, $field;
        }
    }
    
    return join(',', @escaped_fields);
}

sub reduce_lift_status_data {
    my ($input_file, $output_file) = @_;
    
    # 入力ファイルを開く
    open my $fh, '<:utf8', $input_file or die "Cannot open $input_file: $!";
    
    # ヘッダー行を読み取り
    my $header_line = <$fh>;
    my @columns = parse_csv_line($header_line);
    
    # カラムのインデックスを取得
    my %col_index;
    for my $i (0..$#columns) {
        $col_index{$columns[$i]} = $i;
    }
    
    # データを読み込み
    my @data;
    my $line_num = 1;
    while (my $line = <$fh>) {
        $line_num++;
        my @fields = parse_csv_line($line);
        
        # フィールド数チェック
        if (@fields != @columns) {
            print "警告: 行$line_num - フィールド数が合いません (期待: " . @columns . ", 実際: " . @fields . ")\n";
            next;
        }
        
        my %record;
        for my $i (0..$#columns) {
            $record{$columns[$i]} = $fields[$i] // '';
        }
        
        # created_atの値をチェック
        if (!defined $record{created_at} || $record{created_at} eq '') {
            print "警告: 行$line_num - created_atが空です\n";
            print "行内容: $line";
            next;
        }
        
        push @data, \%record;
    }
    close $fh;
    
    print "元データ読み込み完了: " . scalar(@data) . "件\n";
    
    # lift_id毎にグループ化
    my %grouped_data;
    for my $record (@data) {
        my $lift_id = $record->{lift_id};
        push @{$grouped_data{$lift_id}}, $record;
    }
    
    my $unique_lift_ids = keys %grouped_data;
    print "ユニークなlift_id数: $unique_lift_ids\n";
    
    # 重複削除処理
    sub deduplicate_records {
        my $records = shift;
        
        # created_at順にソート（未定義値を考慮）
        my @sorted_records = sort {
            my $a_date = $a->{created_at} // '';
            my $b_date = $b->{created_at} // '';
            $a_date cmp $b_date
        } @$records;
        
        my @filtered_records;
        my $previous_status = '';
        
        for my $record (@sorted_records) {
            # statusが変わった場合、または最初のレコードの場合は保持
            if ($record->{status} ne $previous_status) {
                push @filtered_records, $record;
                $previous_status = $record->{status};
            }
            # 同じstatusが連続する場合は、新しいレコードをスキップ
        }
        
        return \@filtered_records;
    }
    
    # 全てのlift_idに対してデータ削減処理を実行
    my $total_original = 0;
    my $total_filtered = 0;
    my @deduplicated_data;
    
    for my $lift_id (sort { $a <=> $b } keys %grouped_data) {
        my $original_records = $grouped_data{$lift_id};
        my $filtered_records = deduplicate_records($original_records);
        
        my $original_count = scalar @$original_records;
        my $filtered_count = scalar @$filtered_records;
        my $deleted_count = $original_count - $filtered_count;
        
        $total_original += $original_count;
        $total_filtered += $filtered_count;
        
        push @deduplicated_data, @$filtered_records;
        
        print "lift_id $lift_id: $original_count → $filtered_count (${deleted_count}件削減)\n";
    }
    
    # created_at順に最終ソート（未定義値を考慮）
    @deduplicated_data = sort {
        my $a_date = $a->{created_at} // '';
        my $b_date = $b->{created_at} // '';
        $a_date cmp $b_date
    } @deduplicated_data;
    
    # 出力ファイルに書き込み
    open my $out_fh, '>:utf8', $output_file or die "Cannot open $output_file: $!";
    
    # ヘッダー行を出力
    print $out_fh format_csv_line(@columns) . "\n";
    
    # データ行を出力
    for my $record (@deduplicated_data) {
        my @row;
        for my $column (@columns) {
            push @row, $record->{$column} // '';
        }
        print $out_fh format_csv_line(@row) . "\n";
    }
    close $out_fh;
    
    # 結果表示
    print "\n=== 処理結果 ===\n";
    print "元のレコード数: $total_original\n";
    print "削減後のレコード数: $total_filtered\n";
    print "削減されたレコード数: " . ($total_original - $total_filtered) . "\n";
    my $reduction_rate = sprintf("%.1f", (($total_original - $total_filtered) / $total_original) * 100);
    print "削減率: ${reduction_rate}%\n";
    print "出力ファイル: $output_file\n";
    
    return {
        original_count => $total_original,
        reduced_count => $total_filtered,
        deleted_count => $total_original - $total_filtered,
        reduction_rate => $reduction_rate
    };
}

# メイン処理
sub main {
    my $input_file = $ARGV[0] || 'lift_status_rows 1.csv';   # 入力ファイル名
    my $output_file = $ARGV[1] || 'lift_status_reduced.csv'; # 出力ファイル名
    
    print "🎿 CSVデータ削減処理開始\n";
    print "入力ファイル: $input_file\n";
    print "出力ファイル: $output_file\n\n";
    
    # ファイル存在チェック
    unless (-f $input_file) {
        print "❌ 入力ファイルが見つかりません: $input_file\n";
        exit 1;
    }
    
    eval {
        reduce_lift_status_data($input_file, $output_file);
        print "\n✅ 処理が正常に完了しました！\n";
        print "Next.js 14 + Tailwind CSS + Supabaseプロジェクトでご利用ください。\n";
    };
    
    if ($@) {
        print "❌ エラーが発生しました: $@\n";
        exit 1;
    }
}

# 使用例表示
sub show_usage {
    print <<"EOF";
使用方法:
    perl csv_reduction.pl [入力ファイル] [出力ファイル]

例:
    perl csv_reduction.pl "lift_status_rows 1.csv" "lift_status_reduced.csv"
    perl csv_reduction.pl  # デフォルトファイル名を使用

機能:
    - lift_id毎に連続する同じstatusのレコードを削除
    - ステータス変化の履歴は完全に保持
    - 約80%のデータ削減効果
    - Mac標準Perl対応（外部モジュール不要）
EOF
}

# ヘルプオプション
if (@ARGV && ($ARGV[0] eq '-h' || $ARGV[0] eq '--help')) {
    show_usage();
    exit 0;
}

# スクリプト実行
main() if __FILE__ eq $0;

