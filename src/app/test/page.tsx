'use client'

import { useState } from 'react';

type TestResult = {
  success: boolean;
  message: string;
  details?: Array<{
    resortId: string;
    resortName: string;
    success: boolean;
    count?: number;
    error?: string;
  }>;
};

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestClick = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // APIエンドポイントを使用してリフト情報を更新
      const response = await fetch('/api/update-lift-statuses');
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }
      
      const testResult = await response.json();
      setResult(testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">リフト情報更新テスト</h1>
      
      <button 
        onClick={handleTestClick}
        disabled={loading}
        className={`px-4 py-2 rounded ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white mb-4`}
      >
        {loading ? '更新中...' : 'リフト情報を更新'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>エラー:</strong> {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">実行結果</h2>
          <div className={`p-3 rounded mb-4 ${result.success ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p><strong>ステータス:</strong> {result.success ? '成功' : '失敗'}</p>
            <p><strong>メッセージ:</strong> {result.message}</p>
          </div>

          {result.details && result.details.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-2">スキー場別更新状況</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2">リゾートID</th>
                      <th className="border px-4 py-2">リゾート名</th>
                      <th className="border px-4 py-2">ステータス</th>
                      <th className="border px-4 py-2">更新件数</th>
                      <th className="border px-4 py-2">エラー詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((detail, index) => (
                      <tr key={index} className={detail.success ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="border px-4 py-2">{detail.resortId}</td>
                        <td className="border px-4 py-2">{detail.resortName}</td>
                        <td className="border px-4 py-2">
                          <span className={`px-2 py-1 rounded ${detail.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {detail.success ? 'OK' : 'NG'}
                          </span>
                        </td>
                        <td className="border px-4 py-2">{detail.count || '-'}</td>
                        <td className="border px-4 py-2 text-red-600">{detail.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 