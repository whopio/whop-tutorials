import { getChannelVideos, resolveChannel } from "@/lib/channels";
import { VideoGrid } from "@/components/feed/video-grid";

/** CHANNEL-4: the channel Videos tab. */
export default async function ChannelVideosPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const channel = await resolveChannel(handle);
  const videos = await getChannelVideos(channel.id);

  if (videos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-fg-muted">
        This channel hasn&apos;t published any videos yet.
      </p>
    );
  }
  return <VideoGrid videos={videos} />;
}
