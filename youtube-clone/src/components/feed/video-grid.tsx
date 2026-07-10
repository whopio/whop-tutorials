import { VideoCard, type FeedVideo } from "./video-card";

/** The canonical responsive feed grid, reused by Library + subscription pages. */
export function VideoGrid({ videos }: { videos: FeedVideo[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
