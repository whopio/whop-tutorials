import { getChannelVideos, resolveChannel } from "@/lib/channels";
import { VideoGrid } from "@/components/feed/video-grid";

/** CHANNEL-10: the channel Home tab — its public uploads (empty state otherwise). */
export default async function ChannelHomePage({
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
