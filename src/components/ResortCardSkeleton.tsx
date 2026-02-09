export function ResortCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow p-4 h-32">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}
