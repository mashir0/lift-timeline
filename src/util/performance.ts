interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
}

class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * パフォーマンス計測を開始します
   * @param label 計測の識別子
   * @returns 開始時間
   */
  static start(label: string): number {
    const startTime = performance.now();
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)?.push({ startTime, endTime: 0, duration: 0 });
    return startTime;
  }

  /**
   * パフォーマンス計測を終了し、結果を記録します
   * @param label 計測の識別子
   * @returns 計測結果
   */
  static end(label: string): PerformanceMetrics {
    const endTime = performance.now();
    const metrics = this.metrics.get(label);
    if (!metrics || metrics.length === 0) {
      throw new Error(`No performance measurement started for label: ${label}`);
    }

    const currentMetric = metrics[metrics.length - 1];
    currentMetric.endTime = endTime;
    currentMetric.duration = endTime - currentMetric.startTime;

    return currentMetric;
  }

  /**
   * 特定のラベルの計測結果を取得します
   * @param label 計測の識別子
   * @returns 計測結果の配列
   */
  static getMetrics(label: string): PerformanceMetrics[] {
    return this.metrics.get(label) || [];
  }

  /**
   * すべての計測結果を取得します
   * @returns すべての計測結果
   */
  static getAllMetrics(): Map<string, PerformanceMetrics[]> {
    return this.metrics;
  }

  /**
   * 計測結果をクリアします
   * @param label 計測の識別子（指定しない場合はすべてクリア）
   */
  static clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}

export default PerformanceMonitor; 