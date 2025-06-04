import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

type HeaderProps = {
  lastUpdated: Date;
  onRefresh: () => void;
};

export function Header({ lastUpdated, onRefresh }: HeaderProps) {
  // クライアントサイドでのみ時刻を表示するために、useEffectでマウント後に表示
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">スキーリフト運行状況</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              最終更新: {mounted ? lastUpdated.toLocaleTimeString() : ''}
            </span>
            <button
              onClick={onRefresh}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}