import { RefreshButton } from '@/components/RefreshButton';

type HeaderProps = {
  lastUpdated: Date;
};

export function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">スキーリフト運行状況</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
            </span>
            <RefreshButton />
          </div>
        </div>
      </div>
    </header>
  );
}
