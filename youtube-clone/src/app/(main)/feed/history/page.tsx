import { requireUser } from "@/lib/auth";
import { getHistory, isHistoryPaused } from "@/lib/history";
import { VideoCard } from "@/components/feed/video-card";
import { HistoryControls } from "@/components/library/history-controls";

export const metadata = { title: "History - Wavora" };

export default async function HistoryPage() {
  const user = await requireUser();
  const [items, paused] = await Promise.all([
    getHistory(user.id),
    isHistoryPaused(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:flex-row-reverse">
      <aside className="lg:w-72 lg:shrink-0">
        <HistoryControls initialPaused={paused} hasHistory={items.length > 0} />
      </aside>

      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold">Watch history</h1>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => (
              <VideoCard
                key={it.video.id}
                video={it.video}
                progressSeconds={it.progressSeconds}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-fg-muted">
            {paused
              ? "Watch history is paused. Turn it back on to start tracking again."
              : "Videos you watch will show up here."}
          </p>
        )}
      </div>
    </div>
  );
}
