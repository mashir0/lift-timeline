'use client';

import { useState } from 'react';
import type { LiftStatusResponse, ResortLiftStatus } from '@/types';
import { fetchFromDatabase } from '@/lib';

export default function TestPage() {
  const [statuses, setStatuses] = useState<LiftStatusResponse[]>([]);
  const [dbStatuses, setDbStatuses] = useState<ResortLiftStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/lift-status');
      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }
      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromDb = async () => {
    try {
      setLoading(true);
      setError(null);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7日前からのデータを取得

      const data = await fetchFromDatabase({
        resortId: 'resort_01',
        startDate,
        endDate
      });
      setDbStatuses(data);
    } catch (err) {
      console.error('詳細なエラー情報:', err);
      setError(
        err instanceof Error 
          ? `DBエラー: ${err.message}` 
          : 'DBからの取得中にエラーが発生しました'
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">リフト状況テスト</h1>
      
      <div className="flex gap-4 mb-4">
        {/* ステータス取得 */}
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? '読み込み中...' : 'ステータス取得'}
        </button>

        {/* DB取得 */}
        <button
          onClick={fetchFromDb}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? '読み込み中...' : 'DB取得'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-bold mb-4">API取得データ</h2>
          <div className="space-y-4">
            {statuses.map((status, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded shadow"
              >
                <div className="font-semibold">
                  リフトID: {status.liftId}
                </div>
                <div>
                  ステータス: {status.statusJa}
                </div>
                <div className="text-sm text-gray-500">
                  更新時刻: {new Date(status.timestamp).toLocaleString('ja-JP')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">DB取得データ</h2>
          <div className="space-y-4">
            {dbStatuses.map((status, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded shadow"
              >
                <div className="font-semibold">
                  リフトID: {status.lift_id}
                </div>
                <div>
                  ステータス: {status.status_ja}
                </div>
                <div className="text-sm text-gray-500">
                  更新時刻: {new Date(status.created_at).toLocaleString('ja-JP')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 