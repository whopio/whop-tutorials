import { FeedSkeleton } from "@/components/Skeletons";

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <div className="h-8 w-40 bg-surface rounded animate-pulse mb-6" aria-hidden="true" />
      <FeedSkeleton count={5} />
    </div>
  );
}
