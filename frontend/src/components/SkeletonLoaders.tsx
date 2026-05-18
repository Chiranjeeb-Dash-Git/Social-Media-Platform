export function PostCardSkeleton() {
  return (
    <div className="rounded-md bg-white shadow flex mb-4 overflow-hidden border border-gray-200 animate-pulse">
      {/* Vote column skeleton */}
      <div className="w-12 bg-zinc-100 border-r border-gray-200 p-2 flex flex-col items-center gap-2">
        <div className="w-6 h-6 bg-zinc-200 rounded-sm" />
        <div className="w-4 h-4 bg-zinc-200 rounded-sm" />
        <div className="w-6 h-6 bg-zinc-200 rounded-sm" />
      </div>

      {/* Content column skeleton */}
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-24 h-3 bg-zinc-200 rounded" />
          <div className="w-4 h-3 bg-zinc-200 rounded" />
          <div className="w-16 h-3 bg-zinc-200 rounded" />
        </div>
        
        <div className="w-3/4 h-5 bg-zinc-200 rounded mb-4" />
        
        <div className="space-y-2 mb-4">
          <div className="w-full h-4 bg-zinc-200 rounded" />
          <div className="w-5/6 h-4 bg-zinc-200 rounded" />
        </div>

        <div className="w-24 h-6 bg-zinc-200 rounded" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
