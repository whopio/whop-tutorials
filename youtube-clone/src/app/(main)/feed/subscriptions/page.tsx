import { requireUser } from "@/lib/auth";
import { getSubscriptionsFeed } from "@/lib/library";
import { VideoGrid } from "@/components/feed/video-grid";

export const metadata = { title: "Subscriptions - Wavora" };

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const videos = await getSubscriptionsFeed(user.id);

  return (
    <div className="mx-auto max-w-[2400px]">
      <h1 className="mb-6 text-2xl font-bold">Subscriptions</h1>
      {videos.length > 0 ? (
        <VideoGrid videos={videos} />
      ) : (
        <div className="py-16 text-center text-sm text-fg-muted">
          No videos yet. Subscribe to channels and their latest uploads show up
          here.
        </div>
      )}
    </div>
  );
}
