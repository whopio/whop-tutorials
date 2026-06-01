export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-3 rounded bg-surface animate-pulse"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function StoryCardSkeleton() {
  return (
    <div className="py-6 border-b border-border last:border-0">
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-3">
          <SkeletonLine width="40%" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="60%" />
          <SkeletonLine width="30%" />
        </div>
        <div
          className="size-[112px] sm:size-[160px] rounded-sm bg-surface animate-pulse shrink-0"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="border-t border-border" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}
