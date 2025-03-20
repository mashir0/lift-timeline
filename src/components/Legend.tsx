import React from 'react';

type LegendProps = {
  mode: 'daily' | 'weekly';
};

export function Legend({ mode }: LegendProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-2">凡例</h3>
      <p className="text-xs text-gray-500 mb-3">
        運行状況は10分ごとに自動更新されます
      </p>
      
      {mode === 'daily' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 rounded" />
            <span className="text-sm">運行中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 rounded" />
            <span className="text-sm">低速運転</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 rounded" />
            <span className="text-sm">運休/調査中/準備中</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 rounded" />
            <span className="text-sm">運行</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 rounded" />
            <span className="text-sm">運休</span>
          </div>
        </div>
      )}
    </div>
  );
}