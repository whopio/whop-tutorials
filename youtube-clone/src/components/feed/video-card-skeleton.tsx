/** Placeholder card mirroring the final video-card layout (DESIGN-10). */
export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-hover" />
      <div className="flex gap-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-hover" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-[90%] animate-pulse rounded bg-hover" />
          <div className="h-3 w-[55%] animate-pulse rounded bg-hover" />
          <div className="h-3 w-[40%] animate-pulse rounded bg-hover" />
        </div>
      </div>
    </div>
  );
}
