'use client';

import { useRouter } from 'next/navigation';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="更新"
    >
      <ArrowPathIcon className="w-5 h-5 text-gray-600" />
    </button>
  );
}
