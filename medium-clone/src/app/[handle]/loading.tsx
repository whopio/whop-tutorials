import { FeedSkeleton, SkeletonLine } from "@/components/Skeletons";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 sm:px-6 py-8 sm:py-12">
      <div className="pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          <div
            className="size-16 rounded-full bg-surface animate-pulse shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 space-y-3 pt-2">
            <SkeletonLine width="40%" />
            <SkeletonLine width="25%" />
            <SkeletonLine width="70%" />
          </div>
        </div>
      </div>
      <FeedSkeleton count={3} />
    </div>
  );
}
