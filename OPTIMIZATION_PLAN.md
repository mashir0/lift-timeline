# CloudFlare Workers 10ms制限対応最適化計画

## 絶対要件

### CloudFlare Workers 無料枠制約
- **CPU時間制限: 10ms以内**
- **メモリ制限: 128MB**
- **リクエストサイズ: 100MB**
- **同時実行数: 100**

### 最適化の基本方針
1. **1リクエスト = 1データフェッチ** の原則
2. **並列処理の最小化**
3. **重い計算処理の回避**
4. **キャッシュの積極活用**

### データフェッチの制約
- **getAllResorts(), getAllLifts()**: サーバーコンポーネント（page.tsx）で実行する
- **各リゾートのログ**: クライアントサイドからサーバーアクションを使用して取得
- **1つのリクエストで1つのデータフェッチのみ**

## 新しい最適化方針

### 1. **リゾート単位での一括ログ取得**
- サーバーアクションでリゾートごとに全リフトのログを一括取得
- データベースクエリの回数を最小化
- ネットワークリクエスト数の削減

### 2. **クライアント側でのログ処理**
- 取得したログの処理をクライアント側で実行
- リフトごとの振り分け処理
- 重複レコードの削除処理
- サーバーサイドのCPU時間削減

### 3. **重複レコード削除関数の準備**
- 1リフトのログを処理する関数として実装
- 将来的にサーバーアクションとして実行可能な設計
- 処理時間の最小化を考慮した設計

### 4. **クライアント側パフォーマンス計測**
- Console.logによる軽量な計測
- 本番環境での確認が容易
- リアルタイムでのパフォーマンス監視

## 現在の問題点

### 1. **複数データフェッチによるCPU時間超過**
```typescript
// ❌ 現在の問題のある実装
export default async function TimelinePage() {
  // 複数のデータフェッチはCPU時間を超過
  const resorts = await fetchAllResorts();        // 5ms
  const liftStatuses = await fetchAllLiftStatuses(); // 8ms
  const weatherData = await fetchWeatherData();   // 3ms
  // 合計: 16ms (制限超過!)
}
```

### 2. **サーバーサイドでの重い処理**
- ログの振り分け処理がサーバーサイドで実行
- 重複レコード削除がCPU時間に加算
- データ変換処理の負荷

### 3. **パフォーマンス計測の困難性**
- サーバーサイドでの計測が本番環境で確認困難
- デバッグ情報の取得が制限される

## 最適化の道順

### 第1段階: リゾート単位一括取得の実装（最優先）

#### 1.1 サーバーアクションの最適化
**対象ファイル**: `src/lib/actions.ts`
**変更内容**:
- リゾート単位での一括ログ取得（生データ）
- 軽量なクエリの使用
- エラーハンドリングの実装

**実装例**:
```typescript
'use server'
import { fetchResortLiftLogs } from './supabaseDto';
import type { ResortLiftLogs } from '@/types';

export async function getResortLiftLogs(
  resortId: number, 
  date: string
): Promise<ResortLiftLogs> {
  try {
    // リゾート単位で一括取得（生データ、処理はクライアント側で実行）
    const logs = await fetchResortLiftLogs(resortId, date);
    
    return logs;
  } catch (error) {
    console.error(`Error fetching resort lift logs for resort ${resortId}:`, error);
    return { resortId, liftLogs: {}, hours: [] };
  }
}
```

#### 1.2 データベースクエリの最適化
**対象ファイル**: `src/lib/supabaseDto.ts`
**変更内容**:
- リゾート単位での一括クエリ（生データ）
- インデックスを活用した軽量クエリ
- 必要最小限のカラム選択
- サーバーサイドでの処理を最小化

**実装例**:
```typescript
// ✅ 推奨: リゾート単位での一括取得（生データ）
export async function fetchResortLiftLogs(
  resortId: number, 
  date: string
): Promise<ResortLiftLogs> {
  const fromDate = dayjs.tz(date, 'Asia/Tokyo').toDate();
  const toDate = dayjs.tz(date, 'Asia/Tokyo').add(1, 'day').toDate();
  
  // リゾートの全リフトログを一括取得（生データ）
  const data = await fetchTable<DBLiftStatusView>('lift_status_view', {
    resort_id: resortId,
    created_at: { gte: fromDate, lt: toDate } 
  });

  if (!data) {
    return [];
  }
  return data;
}
```

### 第2段階: クライアント側ログ処理の実装

#### 2.1 リフトごとの振り分け処理
**対象ファイル**: `src/components/TimelinePage.tsx`
**変更内容**:
- クライアント側でのログ振り分け
- パフォーマンス計測の実装
- 段階的表示の最適化

**実装例**:
```typescript
// ✅ 推奨: クライアント側でのログ処理
export default function TimelinePage({ 
  basicData, 
  todayString, 
  dateStr 
}: TimelinePageProps) {
  return (
    <div>
      <ResortList resorts={basicData.resorts} />
      
      {/* 各リゾートのログを個別に取得 */}
      {basicData.resorts.map(resort => (
        <Suspense 
          key={resort.id} 
          fallback={<ResortLoading resortId={resort.id} />}
        >
          <ResortTimeline 
            resortId={resort.id}
            dateStr={dateStr}
            lifts={basicData.lifts[resort.id] || {}}
          />
        </Suspense>
      ))}
    </div>
  );
}

// 個別リゾートのタイムライン
async function ResortTimeline({ 
  resortId, 
  dateStr,
  lifts
}: { 
  resortId: number; 
  dateStr: string;
  lifts: Record<number, { name: string; start_time: string; end_time: string }>;
}) {
  const startTime = performance.now();
  
  // リゾート単位で一括取得（生データ）
  const resortLogs = await getResortLiftLogs(resortId, dateStr);
  
  // クライアント側での処理時間計測
  const fetchTime = performance.now() - startTime;
  console.log(`Resort ${resortId} fetch time: ${fetchTime.toFixed(2)}ms`);
  
  // クライアント側でのリフトごとの振り分け処理
  const processStart = performance.now();
  const processedLifts = processResortLifts(resortLogs, lifts);
  const processTime = performance.now() - processStart;
  console.log(`Resort ${resortId} processing time: ${processTime.toFixed(2)}ms`);
  
  return (
    <div>
      {/* リゾート固有のタイムライン表示 */}
      {processedLifts.map(liftData => (
        <LiftTimeline 
          key={liftData.liftId}
          liftId={liftData.liftId}
          logs={liftData.logs}
          hours={resortLogs.hours}
          liftInfo={lifts[liftData.liftId]}
        />
      ))}
    </div>
  );
}

// クライアント側でのリフトごとの振り分け処理
function processResortLifts(
  resortLogs: ResortLiftLogs, 
  lifts: Record<number, { name: string; start_time: string; end_time: string }>
) {
  const processedLifts: Array<{
    liftId: number;
    logs: liftStatus[];
  }> = [];
  
  // 各リフトに対して処理を実行
  Object.entries(lifts).forEach(([liftId, liftInfo]) => {
    const liftIdNum = parseInt(liftId);
    
    // リフトIDでフィルタリング（生データから取得）
    const rawLiftLogs = resortLogs.liftLogs[liftIdNum] || [];
    
    // 連続する同じステータスを削除する関数を実行
    const processedLogs = removeDuplicateLiftLogs(rawLiftLogs);
    
    processedLifts.push({
      liftId: liftIdNum,
      logs: processedLogs
    });
  });
  
  return processedLifts;
}
```

#### 2.2 重複レコード削除関数の実装
**対象ファイル**: `src/lib/dataProcessing.ts`（新規作成）
**変更内容**:
- 1リフトのログを処理する関数
- 将来的にサーバーアクションとして実行可能な設計
- 処理時間の最小化

**実装例**:
```typescript
import dayjs from '@/util/dayjs';
import type { liftStatus } from '@/types';

// ✅ 推奨: 重複レコード削除関数（1リフト処理）
export function removeDuplicateLiftLogs(
  liftLogs: DBLiftStatusView[]
): liftStatus[] {
  if (liftLogs.length === 0) {
    return [];
  }
  
  const processedLogs: liftStatus[] = [];
  let lastStatus: liftStatus | undefined;
  
  // 時間順にソート（既にソートされている場合は不要）
  const sortedLogs = [...liftLogs].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    const roundCreatedAt = roundMinutes(dayjs.tz(log.created_at, 'UTC')).toISOString();
    
    // 同じ時間のログがある場合は、1つ前のログを削除
    if (lastStatus?.round_created_at === roundCreatedAt) {
      processedLogs.pop();
      lastStatus = processedLogs.at(-1);
    }
    
    // 連続する同じステータスは無視（最後のログは必ず追加）
    const isLastLogForThisLift = i === sortedLogs.length - 1;
    if (!lastStatus || lastStatus.status !== log.status || isLastLogForThisLift) {
      const newStatus = {
        status: log.status,
        created_at: log.created_at,
        round_created_at: roundCreatedAt,
      };
      processedLogs.push(newStatus);
      lastStatus = newStatus;
    }
  }
  
  return processedLogs;
}

// 時間を1セグメントごとに丸める（既存の関数を再利用）
const roundMinutes = (dayjs: dayjs.Dayjs): dayjs.Dayjs => {
  const minutes = Math.floor(dayjs.minute() / 15) * 15; // 15分セグメント
  return dayjs.minute(minutes).startOf('minute');
};

// 将来的にサーバーアクションとして実行可能な形式
export async function processLiftLogs(
  liftLogs: DBLiftStatusView[]
): Promise<liftStatus[]> {
  return removeDuplicateLiftLogs(liftLogs);
}
```

### 第3段階: パフォーマンス監視の実装

#### 3.1 クライアント側パフォーマンス計測
**対象ファイル**: `src/lib/performance.ts`
**変更内容**:
- Console.logによる軽量な計測
- リアルタイムでのパフォーマンス監視
- 本番環境での確認が容易

**実装例**:
```typescript
// ✅ 推奨: クライアント側パフォーマンス計測
export function measureClientPerformance<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return fn().then(result => {
    const executionTime = performance.now() - startTime;
    
    // Console.logによる軽量な計測
    console.log(`⏱️ ${operationName}: ${executionTime.toFixed(2)}ms`);
    
    // 閾値チェック
    if (executionTime > 1000) {
      console.warn(`🐌 Slow operation: ${operationName} took ${executionTime.toFixed(2)}ms`);
    } else if (executionTime > 500) {
      console.info(`⚠️ Moderate operation: ${operationName} took ${executionTime.toFixed(2)}ms`);
    }
    
    return result;
  }).catch(error => {
    const executionTime = performance.now() - startTime;
    console.error(`❌ Error in ${operationName} after ${executionTime.toFixed(2)}ms:`, error);
    throw error;
  });
}

// 軽量なログ関数
export function logPerformance(operation: string, time: number, details?: any) {
  console.log(`📊 ${operation}: ${time.toFixed(2)}ms`, details || '');
}
```

#### 3.2 データ処理パフォーマンス監視
**対象ファイル**: `src/components/TimelinePage.tsx`
**変更内容**:
- データ処理時間の計測
- 重複レコード削除処理の監視
- メモリ使用量の監視

**実装例**:
```typescript
// データ処理のパフォーマンス監視
function processResortData(resortLogs: ResortLiftLogs) {
  const startTime = performance.now();
  
  // リフトごとのデータ処理
  const processedData = Object.entries(resortLogs.liftLogs).map(([liftId, logs]) => {
    const liftStartTime = performance.now();
    
    // 重複レコード削除
    const processedLogs = removeDuplicateLiftLogs(logs);
    
    const liftProcessTime = performance.now() - liftStartTime;
    console.log(`🔧 Lift ${liftId} processing: ${liftProcessTime.toFixed(2)}ms`);
    
    return {
      liftId: parseInt(liftId),
      logs: processedLogs
    };
  });
  
  const totalProcessTime = performance.now() - startTime;
  console.log(`🏭 Total resort processing: ${totalProcessTime.toFixed(2)}ms`);
  
  return processedData;
}
```

### 第4段階: キャッシュ戦略の最適化

#### 4.1 クライアント側キャッシュ
**対象ファイル**: `src/lib/cache.ts`
**変更内容**:
- リゾート単位でのキャッシュ
- クライアント側でのキャッシュ確認
- 軽量なキャッシュキー生成

**実装例**:
```typescript
// ✅ 推奨: クライアント側キャッシュ
export function getClientCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // 5分のキャッシュ有効期限
    if (now - timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`✅ Cache hit: ${key}`);
    return data;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export function setClientCache<T>(key: string, data: T): void {
  try {
    const entry = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
    console.log(`💾 Cached: ${key}`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}
```

## 期待される効果

### 技術指標
- **CPU時間**: 5ms以下（現在の70%削減）
- **レスポンス時間**: 初回表示0.5秒以下
- **エラー率**: 0.5%以下
- **メモリ使用量**: 現在の90%以下

### ユーザー体験指標
- **初回表示速度**: 大幅改善
- **段階的表示の体感**: 良好
- **エラー時の復旧**: 迅速
- **全体的な満足度**: 向上

### 運用指標
- **10ms制限超過率**: 0%
- **キャッシュヒット率**: 85%以上
- **データベースクエリ数**: 現在の20%以下
- **API呼び出し数**: 現在の10%以下

## パフォーマンス目標

### 📊 具体的な数値目標
- **データフェッチ: 2-3ms以内**
- **クライアント側処理: 5ms以内**
- **全体処理: 8ms以内**
- **バッファ: 2ms**

### 🔧 最適化の優先順位
1. **サーバーサイド処理の最小化**
2. **クライアント側処理の最適化**
3. **キャッシュの活用**
4. **パフォーマンス監視の実装**

## 実装の詳細手順

### Phase 1: サーバーサイド最適化
- [ ] 1. **リゾート単位一括取得の実装**
   - [ ] `getResortLiftLogs`サーバーアクションの実装
   - [ ] データベースクエリの最適化
   - [ ] エラーハンドリングの実装

- [ ] 2. **データベースクエリの最適化**
   - [ ] インデックスを活用した軽量クエリ
   - [ ] 必要最小限のカラム選択
   - [ ] クエリパフォーマンスの測定

### Phase 2: クライアント側処理
- [ ] 1. **ログ振り分け処理の実装**
   - [ ] リフトごとのデータ振り分け
   - [ ] パフォーマンス計測の実装
   - [ ] 段階的表示の最適化

- [ ] 2. **重複レコード削除関数の実装**
   - [ ] `removeDuplicateLiftLogs`関数の実装
   - [ ] 1リフト処理の最適化
   - [ ] 将来的なサーバーアクション化の準備

### Phase 3: パフォーマンス監視
- [ ] 1. **クライアント側計測の実装**
   - [ ] Console.logによる軽量計測
   - [ ] リアルタイム監視の実装
   - [ ] 閾値アラートの設定

- [ ] 2. **キャッシュ戦略の最適化**
   - [ ] クライアント側キャッシュの実装
   - [ ] キャッシュ有効期限の設定
   - [ ] キャッシュパフォーマンスの測定

### Phase 4: 検証と調整
- [ ] 1. **パフォーマンステスト**
   - [ ] CPU時間の測定
   - [ ] レスポンス時間の確認
   - [ ] メモリ使用量の監視

- [ ] 2. **ユーザビリティテスト**
   - [ ] 段階的表示の体感確認
   - [ ] エラーハンドリングの動作確認
   - [ ] キャッシュ効果の確認

## 成功指標

### 技術指標
- **CPU時間**: 5ms以下（現在の70%削減）
- **レスポンス時間**: 初回表示0.5秒以下
- **エラー率**: 0.5%以下
- **メモリ使用量**: 現在の90%以下

### ユーザー体験指標
- **初回表示速度**: 大幅改善
- **段階的表示の体感**: 良好
- **エラー時の復旧**: 迅速
- **全体的な満足度**: 向上

### 運用指標
- **10ms制限超過率**: 0%
- **キャッシュヒット率**: 85%以上
- **データベースクエリ数**: 現在の20%以下
- **API呼び出し数**: 現在の10%以下

## リスク評価と対策

### 🔴 **高リスク項目**

#### 1. **クライアント側処理の負荷**
**リスク**: 大量データの処理でクライアント側が重くなる
**対策**: 
- 段階的な処理実装
- メモリ使用量の監視
- 必要に応じてサーバーサイド処理の併用

#### 2. **キャッシュの不整合**
**リスク**: クライアント側キャッシュとサーバー側データの不整合
**対策**:
- 適切なキャッシュ有効期限設定
- データ更新時のキャッシュ無効化
- バージョン管理の実装

### 🟡 **中リスク項目**

#### 1. **実装複雑性の増加**
**リスク**: クライアント側の状態管理が複雑化
**対策**:
- 段階的な実装
- 既存コードとの並行運用
- 十分なテストの実施

#### 2. **パフォーマンス計測の精度**
**リスク**: Console.logによる計測の精度
**対策**:
- 複数の計測ポイントの設定
- 統計的な処理による精度向上
- 定期的な検証

### 🟢 **低リスク項目**

#### 1. **重複レコード削除関数の実装**
**リスク**: 最小限（関数の実装とテストのみ）
**対策**: 段階的な実装と動作確認

## 最終目標

CloudFlare Workersの無料枠制限内での安定した運用を実現し、以下の指標を達成：

- **CPU時間**: 5ms以下（10ms制限の50%以下）
- **レスポンス時間**: 平均0.5秒以下
- **エラー率**: 0.5%以下
- **ユーザー満足度**: 大幅向上

この最適化により、CloudFlare Workersの無料枠（10ms制限）内で効率的かつ安定して動作するアプリケーションを構築できます。
