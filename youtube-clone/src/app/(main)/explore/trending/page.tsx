import { getTrending } from "@/lib/explore";
import { VideoGrid } from "@/components/feed/video-grid";

export const metadata = { title: "Trending - Wavora" };

export default async function TrendingPage() {
  const videos = await getTrending();

  return (
    <div className="mx-auto max-w-[2400px]">
      <h1 className="mb-6 text-2xl font-bold">Trending</h1>
      {videos.length > 0 ? (
        <VideoGrid videos={videos} />
      ) : (
        <div className="py-16 text-center text-sm text-fg-muted">
          Nothing trending yet. Check back once videos start racking up views.
        </div>
      )}
    </div>
  );
}
