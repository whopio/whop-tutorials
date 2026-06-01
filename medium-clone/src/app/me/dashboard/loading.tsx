import { SkeletonLine } from "@/components/Skeletons";

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-56 bg-surface rounded animate-pulse mb-8" aria-hidden="true" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-background p-4 space-y-2"
          >
            <SkeletonLine width="60%" />
            <SkeletonLine width="40%" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} />
        ))}
      </div>
    </div>
  );
}
