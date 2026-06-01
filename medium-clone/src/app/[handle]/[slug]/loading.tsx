import { SkeletonLine } from "@/components/Skeletons";

export default function StoryLoading() {
  return (
    <article
      className="mx-auto max-w-[680px] px-4 sm:px-0 py-8 sm:py-14 space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-10 w-3/4 bg-surface rounded animate-pulse" aria-hidden="true" />
      <div className="h-6 w-1/2 bg-surface rounded animate-pulse" aria-hidden="true" />
      <div className="flex items-center gap-3 pt-2">
        <div className="size-11 rounded-full bg-surface animate-pulse" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="30%" />
          <SkeletonLine width="20%" />
        </div>
      </div>
      <div className="pt-6 space-y-3">
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine width="92%" />
        <SkeletonLine width="80%" />
        <SkeletonLine />
        <SkeletonLine width="70%" />
      </div>
    </article>
  );
}
