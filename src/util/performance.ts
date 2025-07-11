// ✅ 推奨: CPU時間監視
export function measureExecutionTime<T>(
  fn: () => Promise<T>,
  operationName: string
): Promise<{ result: T; executionTime: number }> {
  const start = performance.now();
  
  return fn().then(result => {
    const executionTime = performance.now() - start;
    
    // 10ms制限の警告
    if (executionTime > 8) { // 8msで警告
      console.warn(`Slow execution in ${operationName}: ${executionTime.toFixed(2)}ms`);
    } else if (executionTime > 5) { // 5ms以上の場合のみログ
      console.info(`Moderate execution in ${operationName}: ${executionTime.toFixed(2)}ms`);
    }
    
    return { result, executionTime };
  });
}

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

// 軽量なログ
export function logPerformance(operation: string, time: number, details?: any) {
  console.log(`📊 ${operation}: ${time.toFixed(2)}ms`, details || '');
}

// パフォーマンス監視クラス
export class PerformanceMonitor {
  private static measurements: Map<string, { start: number; end?: number }> = new Map();

  static start(operationName: string): void {
    this.measurements.set(operationName, { start: performance.now() });
  }

  static end(operationName: string): { duration: number; operationName: string } | null {
    const measurement = this.measurements.get(operationName);
    if (!measurement) {
      console.warn(`No measurement found for operation: ${operationName}`);
      return null;
    }

    measurement.end = performance.now();
    const duration = measurement.end - measurement.start;

    // 10ms制限の監視
    if (duration > 8) {
      console.warn(`⚠️ Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    } else if (duration > 5) {
      console.info(`ℹ️ Moderate operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    this.measurements.delete(operationName);
    return { duration, operationName };
  }

  static getCurrentMeasurement(operationName: string): number | null {
    const measurement = this.measurements.get(operationName);
    if (!measurement) return null;
    
    return performance.now() - measurement.start;
  }
} 