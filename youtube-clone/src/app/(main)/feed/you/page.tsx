import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLikedVideos, getWatchLater } from "@/lib/library";
import { getUserPlaylists } from "@/lib/playlists";
import { getHistory } from "@/lib/history";
import { VideoCard, type FeedVideo } from "@/components/feed/video-card";
import { PlaylistCard } from "@/components/feed/playlist-card";

export const metadata = { title: "You - Wavora" };

function Shelf({
  title,
  href,
  videos,
  progress,
}: {
  title: string;
  href: string;
  videos: FeedVideo[];
  progress?: Map<string, number>;
}) {
  if (videos.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link
          href={href}
          className="text-sm font-medium text-accent hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {videos.map((v) => (
          <div key={v.id} className="w-72 shrink-0 sm:w-80">
            <VideoCard video={v} progressSeconds={progress?.get(v.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** LIB-14: the Library hub aggregating History, Watch later, Liked, and Playlists. */
export default async function YouPage() {
  const user = await requireUser();
  const [history, watchLater, liked, playlists] = await Promise.all([
    getHistory(user.id),
    getWatchLater(user.id),
    getLikedVideos(user.id),
    getUserPlaylists(user.id),
  ]);

  const progress = new Map(history.map((h) => [h.video.id, h.progressSeconds]));
  const empty =
    history.length === 0 &&
    watchLater.length === 0 &&
    liked.length === 0 &&
    playlists.length === 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-6 text-2xl font-bold">You</h1>
      {empty ? (
        <p className="py-16 text-center text-sm text-fg-muted">
          Watch, like, and save videos to build your library.
        </p>
      ) : (
        <>
          <Shelf
            title="History"
            href="/feed/history"
            videos={history.slice(0, 10).map((h) => h.video)}
            progress={progress}
          />
          <Shelf
            title="Watch later"
            href="/playlist?list=WL"
            videos={watchLater.slice(0, 10)}
          />
          <Shelf
            title="Liked videos"
            href="/playlist?list=LL"
            videos={liked.slice(0, 10)}
          />
          {playlists.length > 0 ? (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Playlists</h2>
                <Link
                  href="/feed/playlists"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
                {playlists.slice(0, 10).map((p) => (
                  <div key={p.id} className="w-72 shrink-0 sm:w-80">
                    <PlaylistCard playlist={p} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
